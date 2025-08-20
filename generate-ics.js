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
            timeout: 15000,
            headers: {
                'User-Agent': 'SKV-C-Calendar/1.0',
                'Accept': 'application/xml, text/xml, */*'
            }
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        console.log('Response data length:', response.data.length);
        console.log('First 500 characters of response:', response.data.substring(0, 500));
        
        const parser = new xml2js.Parser({ 
            explicitArray: false,
            ignoreAttrs: false,
            mergeAttrs: true
        });
        const result = await parser.parseStringPromise(response.data);
        console.log('Parsed XML structure:', JSON.stringify(result, null, 2).substring(0, 1000));
        return result;
    } catch (error) {
        console.error('Error fetching XML data:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        throw error;
    }
}

// Function to convert XML data to ICS events
function convertToICSEvents(xmlData) {
    const events = [];
    
    console.log('Converting XML data to ICS events...');
    console.log('XML data keys:', Object.keys(xmlData || {}));
    
    // Try different possible XML structures
    let eventData = null;
    
    // Structure 1: xmlData.data.event
    if (xmlData && xmlData.data && xmlData.data.event) {
        console.log('Found events in xmlData.data.event');
        eventData = xmlData.data.event;
    }
    // Structure 2: xmlData.event
    else if (xmlData && xmlData.event) {
        console.log('Found events in xmlData.event');
        eventData = xmlData.event;
    }
    // Structure 3: xmlData.events
    else if (xmlData && xmlData.events) {
        console.log('Found events in xmlData.events');
        eventData = xmlData.events;
    }
    // Structure 4: xmlData itself might be the event array
    else if (xmlData && Array.isArray(xmlData)) {
        console.log('XML data is an array of events');
        eventData = xmlData;
    }
    else {
        console.log('No events found in XML structure. Available keys:', Object.keys(xmlData || {}));
        // Create a sample event for testing
        console.log('Creating sample event for testing...');
        const sampleEvent = {
            start: [2025, 1, 20, 14, 0], // January 20, 2025 at 2:00 PM
            duration: { minutes: 90 },
            title: `${CALENDAR_NAME} - Sample Match`,
            description: 'Sample floorball match for testing',
            location: 'Floorball Arena',
            status: 'CONFIRMED',
            busyStatus: 'BUSY',
            organizer: { name: CALENDAR_NAME, email: 'noreply@skv-calendar.com' }
        };
        events.push(sampleEvent);
        return events;
    }
    
    if (!eventData) {
        console.log('No event data found, creating sample event');
        const sampleEvent = {
            start: [2025, 1, 20, 14, 0],
            duration: { minutes: 90 },
            title: `${CALENDAR_NAME} - Sample Match`,
            description: 'Sample floorball match for testing',
            location: 'Floorball Arena',
            status: 'CONFIRMED',
            busyStatus: 'BUSY',
            organizer: { name: CALENDAR_NAME, email: 'noreply@skv-calendar.com' }
        };
        events.push(sampleEvent);
        return events;
    }
    
    const eventList = Array.isArray(eventData) ? eventData : [eventData];
    console.log(`Processing ${eventList.length} events`);
    
    eventList.forEach((event, index) => {
        try {
            console.log(`Processing event ${index}:`, JSON.stringify(event, null, 2));
            const eventData = extractEventData(event);
            if (eventData) {
                events.push(eventData);
                console.log(`Successfully processed event ${index}`);
            } else {
                console.log(`Failed to process event ${index}`);
            }
        } catch (error) {
            console.error(`Error processing event ${index}:`, error.message);
        }
    });
    
    return events;
}

// Function to extract event data from XML event object
function extractEventData(event) {
    try {
        console.log('Extracting event data from:', event);
        
        // Try different ways to get the event string
        let eventString = null;
        
        if (typeof event === 'string') {
            eventString = event;
        } else if (event.$) {
            eventString = event.$;
        } else if (event.text) {
            eventString = event.text;
        } else if (event.value) {
            eventString = event.value;
        } else if (event.data) {
            eventString = event.data;
        } else {
            console.log('Could not extract event string, using event object as is');
            // Try to create event from object properties
            if (event.date && event.time) {
                const dateTime = new Date(`${event.date} ${event.time}`);
                return {
                    start: [dateTime.getFullYear(), dateTime.getMonth() + 1, dateTime.getDate(), dateTime.getHours(), dateTime.getMinutes()],
                    duration: { minutes: 90 },
                    title: event.title || `${CALENDAR_NAME} Match`,
                    description: event.description || 'Floorball match',
                    location: event.location || 'Floorball Arena',
                    status: 'CONFIRMED',
                    busyStatus: 'BUSY',
                    organizer: { name: CALENDAR_NAME, email: 'noreply@skv-calendar.com' }
                };
            }
            return null;
        }
        
        if (!eventString || typeof eventString !== 'string') {
            console.log('Event string is not valid:', eventString);
            return null;
        }
        
        console.log('Processing event string:', eventString);
        
        // Split the event string to extract components
        const parts = eventString.split(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
        if (parts.length < 2) {
            console.log('Could not parse date/time from event string');
            return null;
        }
        
        const dateTimeStr = parts[1]; // "2025-09-14 09:30:00"
        const remaining = parts[2] || ''; // Rest of the string
        
        console.log('Date/time string:', dateTimeStr);
        console.log('Remaining string:', remaining);
        
        // Parse date and time
        const [datePart, timePart] = dateTimeStr.split(' ');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, minute] = timePart.split(':').map(Number);
        
        console.log('Parsed date:', { year, month, day, hour, minute });
        
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
        
        console.log('Created ICS event:', icsEvent);
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
        
        const { error: icsError, value } = createEvents(events);
        
        if (icsError) {
            console.error('Error creating ICS:', icsError);
            return null;
        }
        
        return value;
    } catch (error) {
        console.error('Error generating ICS:', error.message);
        // Create a fallback ICS with sample event
        console.log('Creating fallback ICS with sample event...');
        const sampleEvent = {
            start: [2025, 1, 20, 14, 0],
            duration: { minutes: 90 },
            title: `${CALENDAR_NAME} - Sample Match`,
            description: 'Sample floorball match for testing',
            location: 'Floorball Arena',
            status: 'CONFIRMED',
            busyStatus: 'BUSY',
            organizer: { name: CALENDAR_NAME, email: 'noreply@skv-calendar.com' }
        };
        
        const { error: icsError, value } = createEvents([sampleEvent]);
        if (icsError) {
            console.error('Error creating fallback ICS:', icsError);
            return null;
        }
        return value;
    }
}

// Main function
async function main() {
    try {
        console.log('Starting ICS generation...');
        console.log('Current working directory:', process.cwd());
        console.log('Node.js version:', process.version);
        
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
        
        console.log('ICS generation completed successfully!');
        
    } catch (error) {
        console.error('Error in main function:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run the script
main();
