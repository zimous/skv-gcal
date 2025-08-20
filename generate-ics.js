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
        console.log('Response data length:', response.data.length);
        
        const parser = new xml2js.Parser({ 
            explicitArray: false,
            ignoreAttrs: false,
            mergeAttrs: true
        });
        const result = await parser.parseStringPromise(response.data);
        console.log('Parsed XML structure keys:', Object.keys(result || {}));
        return result;
    } catch (error) {
        console.error('Error fetching XML data:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
        }
        throw error;
    }
}

// Function to convert XML data to ICS events
function convertToICSEvents(xmlData) {
    const events = [];
    
    console.log('Converting XML data to ICS events...');
    
    // The XML structure is: xmlData.matches.match[]
    if (xmlData && xmlData.matches && xmlData.matches.match) {
        const matchList = Array.isArray(xmlData.matches.match) ? xmlData.matches.match : [xmlData.matches.match];
        console.log(`Found ${matchList.length} matches in XML data`);
        
        matchList.forEach((match, index) => {
            try {
                console.log(`Processing match ${index + 1}/${matchList.length}:`, match.home_team, 'vs', match.away_team);
                const eventData = extractMatchData(match);
                if (eventData) {
                    events.push(eventData);
                    console.log(`Successfully processed match ${index + 1}`);
                } else {
                    console.log(`Failed to process match ${index + 1}`);
                }
            } catch (error) {
                console.error(`Error processing match ${index + 1}:`, error.message);
            }
        });
    } else {
        console.log('No matches found in XML structure. Available keys:', Object.keys(xmlData || {}));
        if (xmlData && xmlData.matches) {
            console.log('Matches object keys:', Object.keys(xmlData.matches));
        }
    }
    
    return events;
}

// Function to extract match data from XML match object
function extractMatchData(match) {
    try {
        console.log('Extracting match data from:', {
            home_team: match.home_team,
            away_team: match.away_team,
            date: match.date,
            time: match.time,
            arena_name: match.arena_name
        });
        
        // Check if this is a SKV C match (either home or away)
        // The team name is "TJ Sokol Královské Vinohrady C"
        const isSKVMatch = match.home_team && match.home_team.includes('TJ Sokol Královské Vinohrady C') || 
                          match.away_team && match.away_team.includes('TJ Sokol Královské Vinohrady C');
        
        if (!isSKVMatch) {
            console.log('Not a SKV match, skipping');
            return null;
        }
        
        console.log('Found SKV match!');
        
        // Parse date and time - try different possible field names
        let matchDate, matchTime;
        
        // Try different possible date/time field combinations
        if (match.match_datetime && match.match_time) {
            matchDate = match.match_datetime;
            matchTime = match.match_time;
        } else if (match.date && match.time) {
            matchDate = match.date;
            matchTime = match.time;
        } else if (match.match_date && match.match_time) {
            matchDate = match.match_date;
            matchTime = match.match_time;
        } else if (match.start_date && match.start_time) {
            matchDate = match.start_date;
            matchTime = match.start_time;
        } else if (match.game_date && match.game_time) {
            matchDate = match.game_date;
            matchTime = match.game_time;
        } else {
            // Log all available fields to debug
            console.log('Available match fields:', Object.keys(match));
            console.log('No date/time found in match data');
            return null;
        }
        
        console.log('Match date/time:', matchDate, matchTime);
        
        // Parse the date and time
        // Handle the case where match_datetime contains both date and time
        let dateTime;
        if (matchDate && matchDate.includes(' ')) {
            // match_datetime contains both date and time
            dateTime = new Date(matchDate);
        } else if (matchDate && matchTime) {
            // Separate date and time fields
            dateTime = new Date(`${matchDate} ${matchTime}`);
        } else {
            console.log('Invalid date/time format');
            return null;
        }
        
        if (isNaN(dateTime.getTime())) {
            console.log('Invalid date/time format');
            return null;
        }
        
        const year = dateTime.getFullYear();
        const month = dateTime.getMonth() + 1; // JavaScript months are 0-indexed
        const day = dateTime.getDate();
        const hour = dateTime.getHours();
        const minute = dateTime.getMinutes();
        
        console.log('Parsed date:', { year, month, day, hour, minute });
        
        // Create event title and description
        let title, description;
        
        if (match.home_team && match.away_team) {
            title = `${match.home_team} vs ${match.away_team}`;
            description = `Floorball match: ${match.home_team} vs ${match.away_team}`;
        } else {
            title = `${CALENDAR_NAME} Match`;
            description = 'Floorball match';
        }
        
        // Add arena information if available
        if (match.arena_name) {
            description += `\nVenue: ${match.arena_name}`;
        }
        
        // Create ICS event
        const icsEvent = {
            start: [year, month, day, hour, minute],
            duration: { minutes: 90 }, // Default 90 minutes for floorball matches
            title: title,
            description: description,
            location: match.arena_name || 'Floorball Arena',
            status: 'CONFIRMED',
            busyStatus: 'BUSY',
            organizer: { name: CALENDAR_NAME, email: 'noreply@skv-calendar.com' }
        };
        
        console.log('Created ICS event:', icsEvent);
        return icsEvent;
    } catch (error) {
        console.error('Error extracting match data:', error.message);
        return null;
    }
}

// Function to generate ICS content
async function generateICS() {
    try {
        const xmlData = await fetchXMLData();
        const events = convertToICSEvents(xmlData);
        
        if (events.length === 0) {
            console.log('No SKV matches found in XML data');
            // Create a sample event for testing
            console.log('Creating sample event for testing...');
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
        }
        
        console.log(`Found ${events.length} events`);
        
        const { error: icsError, value } = createEvents(events);
        
        if (icsError) {
            console.error('Error creating ICS:', icsError);
            return null;
        }
        
        // The ics library already adds basic headers, so we need to replace them with our custom ones
        // Remove the default headers and add our custom ones
        const eventsOnly = value.replace(/BEGIN:VCALENDAR[\s\S]*?BEGIN:VEVENT/, 'BEGIN:VEVENT');
        const calendarContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//SKV C//Floorball Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${CALENDAR_NAME}
X-WR-CALDESC:SKV C Floorball Team Calendar
X-WR-TIMEZONE:${TIMEZONE}
${eventsOnly}`;
        
        return calendarContent;
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
        
        // The ics library already adds basic headers, so we need to replace them with our custom ones
        // Remove the default headers and add our custom ones
        const eventsOnly = value.replace(/BEGIN:VCALENDAR[\s\S]*?BEGIN:VEVENT/, 'BEGIN:VEVENT');
        const calendarContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//SKV C//Floorball Calendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${CALENDAR_NAME}
X-WR-CALDESC:SKV C Floorball Team Calendar
X-WR-TIMEZONE:${TIMEZONE}
${eventsOnly}`;
        
        return calendarContent;
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
        
        // Write ICS file with proper calendar headers
        await fs.writeFile('calendar.ics', icsContent);
        console.log('ICS file generated successfully: calendar.ics');
        
        // Also create a backup version
        await fs.writeFile('calendar-full.ics', icsContent);
        console.log('Backup ICS file generated: calendar-full.ics');
        
        console.log('ICS generation completed successfully!');
        
    } catch (error) {
        console.error('Error in main function:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

// Run the script
main();
