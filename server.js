const express = require('express');
const axios = require('axios');
const xml2js = require('xml2js');
const { createEvents } = require('ics');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const XML_FEED_URL = 'https://data.ceskyflorbal.cz/data/?key=D75c6f0d64b419ea2c146fd76878f8d2&format=XML&fbclid=IwY2xjawMS-2tleHRuA2FlbQIxMQABHhCeVyQtWUMgNx0dfCVLjgVuntUHBw1aZ693SSxeEeBuDRDAHi9kQwmgoWam_aem_UdmfoEroXBtBhyp_PZ0CwQ';
const CALENDAR_NAME = 'SKV C';
const TIMEZONE = 'Europe/Prague';

let cachedICS = null;
let lastUpdate = null;

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
    // Based on the XML structure shown in the search results
    if (xmlData && xmlData.data && xmlData.data.event) {
        const eventList = Array.isArray(xmlData.data.event) ? xmlData.data.event : [xmlData.data.event];
        
        eventList.forEach((event, index) => {
            try {
                // Extract event details from the XML structure
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
        // Based on the XML structure: "3XM5-A0082025-09-14 09:30:00119247009:30:0090FAT PIPE Traverza43072"
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
        // Look for patterns like "FAT PIPE Traverza43072" or "TJ Sokol Královské Vinohrady C42394"
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

// Function to update cached ICS data
async function updateCachedICS() {
    try {
        const icsContent = await generateICS();
        if (icsContent) {
            cachedICS = icsContent;
            lastUpdate = new Date();
            console.log('ICS cache updated at:', lastUpdate.toISOString());
        }
    } catch (error) {
        console.error('Error updating cached ICS:', error.message);
    }
}

// Schedule regular updates (every 6 hours)
cron.schedule('0 */6 * * *', () => {
    console.log('Scheduled ICS update triggered');
    updateCachedICS();
});

// Routes
app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <title>SKV C Floorball Calendar</title>
                <style>
                    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
                    .info { background: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0; }
                    .button { background: #007cba; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 5px; }
                    .url { background: #f8f8f8; padding: 10px; border-radius: 3px; font-family: monospace; word-break: break-all; }
                </style>
            </head>
            <body>
                <h1>SKV C Floorball Calendar</h1>
                <div class="info">
                    <h2>Calendar Information</h2>
                    <p><strong>Name:</strong> ${CALENDAR_NAME}</p>
                    <p><strong>Timezone:</strong> ${TIMEZONE}</p>
                    <p><strong>Last Update:</strong> ${lastUpdate ? lastUpdate.toLocaleString() : 'Not available'}</p>
                    <p><strong>Source:</strong> Czech Floorball Federation</p>
                </div>
                
                <h2>Add to Calendar</h2>
                <p>Use one of these methods to add the calendar to your Google Calendar:</p>
                
                <h3>Method 1: Direct URL</h3>
                <p>Copy this URL and add it to Google Calendar:</p>
                <div class="url">${req.protocol}://${req.get('host')}/calendar.ics</div>
                
                <h3>Method 2: Download and Import</h3>
                <a href="/calendar.ics" class="button">Download ICS File</a>
                
                <h3>Method 3: Google Calendar Direct Add</h3>
                <a href="https://calendar.google.com/calendar/r?cid=${encodeURIComponent(req.protocol + '://' + req.get('host') + '/calendar.ics')}" class="button" target="_blank">Add to Google Calendar</a>
                
                <div class="info">
                    <h3>Instructions for Google Calendar:</h3>
                    <ol>
                        <li>Open Google Calendar</li>
                        <li>Click the "+" next to "Other calendars"</li>
                        <li>Select "From URL"</li>
                        <li>Paste the calendar URL above</li>
                        <li>Click "Add calendar"</li>
                    </ol>
                </div>
            </body>
        </html>
    `);
});

app.get('/calendar.ics', async (req, res) => {
    try {
        // If no cached data or cache is old (older than 1 hour), update it
        if (!cachedICS || !lastUpdate || (Date.now() - lastUpdate.getTime()) > 3600000) {
            await updateCachedICS();
        }
        
        if (!cachedICS) {
            res.status(500).send('Error generating calendar data');
            return;
        }
        
        res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="skv-c-calendar.ics"');
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
        res.send(cachedICS);
    } catch (error) {
        console.error('Error serving calendar:', error.message);
        res.status(500).send('Error serving calendar');
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        lastUpdate: lastUpdate,
        hasCachedData: !!cachedICS
    });
});

// Initialize the application
async function initialize() {
    console.log('Initializing SKV C Calendar service...');
    console.log('Calendar Name:', CALENDAR_NAME);
    console.log('Timezone:', TIMEZONE);
    console.log('XML Feed URL:', XML_FEED_URL);
    
    // Initial cache update
    await updateCachedICS();
    
    // Start the server
    app.listen(PORT, () => {
        console.log(`SKV C Calendar server running on port ${PORT}`);
        console.log(`Calendar available at: http://localhost:${PORT}/calendar.ics`);
        console.log(`Web interface available at: http://localhost:${PORT}/`);
    });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down SKV C Calendar server...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nShutting down SKV C Calendar server...');
    process.exit(0);
});

// Start the application
initialize().catch(error => {
    console.error('Failed to initialize application:', error);
    process.exit(1);
});

