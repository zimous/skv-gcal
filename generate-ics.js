const axios = require('axios');
const xml2js = require('xml2js');
const { createEvents } = require('ics');
const fs = require('fs').promises;

// Configuration
const XML_FEED_URL = 'https://data.ceskyflorbal.cz/data/?key=D75c6f0d64b419ea2c146fd76878f8d2&format=XML&fbclid=IwY2xjawMS-2tleHRuA2FlbQIxMQABHhCeVyQtWUMgNx0dfCVLjgVuntUHBw1aZ693SSxeEeBuDRDAHi9kQwmgoWam_aem_UdmfoEroXBtBhyp_PZ0CwQ';
const CALENDAR_NAME = 'SKV C';
const TIMEZONE = 'Europe/Prague';

// Function to fetch and parse XML data
async function fetchXMLData() {
    try {
        console.log('Fetching XML data from:', XML_FEED_URL);
        const response = await axios.get(XML_FEED_URL, {
            timeout: 10000,
            headers: {
                'User-Agent': 'SKV-C-Calendar/1.0'
            }
        });
        
        const parser = new xml2js.Parser({ explicitArray: false });
        const result = await parser.parseStringPromise(response.data);
        return result;
    } catch (error) {
        console.error('Error fetching XML data:', error.message);
        throw error;
    }
}

// Function to convert XML data to ICS events
function convertToICSEvents(xmlData) {
    const events = [];
    
    // Navigate through the XML structure to find events
    if (xmlData && xmlData.data && xmlData.data.event) {
        const eventList = Array.isArray(xmlData.data.event) ? xmlData.data.event : [xmlData.data.event];
        
        eventList.forEach((event, index) => {
            try {
                const eventData = extractEventData(event);
                if (eventData) {
                    events.push(eventData);
                }
            } catch (error) {
                console.error(`Error processing event ${index}:`, error.message);
            }
        });
    }
    
    return events;
}

// Function to extract event data from XML event object
function extractEventData(event) {
    try {
        // Parse the event string to extract components
        const eventString = event.$ || event;
        
        if (!eventString || typeof eventString !== 'string') {
            return null;
        }
        
        // Split the event string to extract components
        const parts = eventString.split(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
        if (parts.length < 2) {
            return null;
        }
        
        const dateTimeStr = parts[1]; // "2025-09-14 09:30:00"
        const remaining = parts[2] || ''; // Rest of the string
        
        // Parse date and time
        const [datePart, timePart] = dateTimeStr.split(' ');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, minute] = timePart.split(':').map(Number);
        
        // Extract team names from the remaining string
        const teamMatch = remaining.match(/([A-Za-z\s]+?)(\d{5,})/);
        let title = CALENDAR_NAME;
        let description = '';
        
        if (teamMatch) {
            const teamName = teamMatch[1].trim();
            title = `${CALENDAR_NAME} vs ${teamName}`;
            description = `Floorball match: ${teamName}`;
        }
        
        // Create ICS event
        const icsEvent = {
            start: [year, month, day, hour, minute],
            duration: { minutes: 90 }, // Default 90 minutes for floorball matches
            title: title,
            description: description,
            location: 'Floorball Arena', // Default location
            status: 'CONFIRMED',
            busyStatus: 'BUSY',
            organizer: { name: CALENDAR_NAME, email: 'noreply@skv-calendar.com' }
        };
        
        return icsEvent;
    } catch (error) {
        console.error('Error extracting event data:', error.message);
        return null;
    }
}

// Function to generate ICS content
async function generateICS() {
    try {
        const xmlData = await fetchXMLData();
        const events = convertToICSEvents(xmlData);
        
        if (events.length === 0) {
            console.log('No events found in XML data');
            return null;
        }
        
        console.log(`Found ${events.length} events`);
        
        const { error, value } = createEvents(events);
        
        if (error) {
            console.error('Error creating ICS:', error);
            return null;
        }
        
        return value;
    } catch (error) {
        console.error('Error generating ICS:', error.message);
        return null;
    }
}

// Main function
async function main() {
    try {
        console.log('Starting ICS generation...');
        
        const icsContent = await generateICS();
        
        if (!icsContent) {
            console.error('Failed to generate ICS content');
            process.exit(1);
        }
        
        // Write ICS file
        await fs.writeFile('calendar.ics', icsContent);
        console.log('ICS file generated successfully: calendar.ics');
        
        // Also create a version with proper headers for GitHub Pages
        const fullICSContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//SKV C//Floorball Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${CALENDAR_NAME}
X-WR-CALDESC:SKV C Floorball Team Calendar
X-WR-TIMEZONE:${TIMEZONE}
${icsContent}END:VCALENDAR`;
        
        await fs.writeFile('calendar-full.ics', fullICSContent);
        console.log('Full ICS file generated: calendar-full.ics');
        
    } catch (error) {
        console.error('Error in main function:', error.message);
        process.exit(1);
    }
}

// Run the script
main();
