# SKV C Floorball Calendar

A Node.js application that converts Czech Floorball Federation XML feed into an ICS calendar format that can be added to Google Calendar and other calendar applications.

## Features

- 🏒 Fetches floorball match data from Czech Floorball Federation XML feed
- 📅 Converts XML data to ICS (iCalendar) format
- 🌍 Supports Europe/Prague timezone
- 🔄 Automatic updates every 6 hours
- 💾 Caching for better performance
- 🌐 Web interface for easy calendar access
- 📱 Mobile-friendly design

## Quick Start

### Prerequisites

- Node.js (version 14 or higher)
- npm or yarn

### Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Open your browser and go to `http://localhost:3000`

## Usage

### For End Users

1. **Web Interface**: Visit the web page to see instructions and download options
2. **Direct URL**: Use `http://your-domain.com/calendar.ics` to add to Google Calendar
3. **Download**: Download the ICS file and import it manually

### For Google Calendar

1. Open Google Calendar
2. Click the "+" next to "Other calendars"
3. Select "From URL"
4. Paste the calendar URL: `http://your-domain.com/calendar.ics`
5. Click "Add calendar"

### For Other Calendar Applications

Most calendar applications support ICS files. You can:
- Download the ICS file from `/calendar.ics`
- Import it into your preferred calendar application
- Use the URL directly if your app supports web calendars

## Configuration

The application can be configured by modifying the constants in `server.js`:

```javascript
const XML_FEED_URL = 'https://data.ceskyflorbal.cz/data/?key=...';
const CALENDAR_NAME = 'SKV C';
const TIMEZONE = 'Europe/Prague';
```

## API Endpoints

- `GET /` - Web interface with instructions
- `GET /calendar.ics` - ICS calendar file
- `GET /health` - Health check endpoint

## Deployment

### Option 1: GitHub Pages (Recommended)

This is the easiest way to host your calendar for free:

1. **Create a GitHub repository** and push your code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/your-username/your-repo-name.git
   git push -u origin main
   ```

2. **Enable GitHub Pages**:
   - Go to your repository on GitHub
   - Click "Settings" → "Pages"
   - Select "Deploy from a branch"
   - Choose "main" branch and "/ (root)" folder
   - Click "Save"

3. **Enable GitHub Actions**:
   - The workflow will automatically run every 6 hours
   - You can also manually trigger it from the "Actions" tab

4. **Your calendar will be available at**:
   - Web page: `https://your-username.github.io/your-repo-name/`
   - ICS file: `https://your-username.github.io/your-repo-name/calendar.ics`

### Option 2: Local Development

```bash
npm run dev  # Uses nodemon for auto-restart
```

### Option 3: Traditional Hosting

1. Upload files to your server
2. Install dependencies: `npm install --production`
3. Start the server: `npm start`
4. Use a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start server.js --name "skv-calendar"
   ```

### Option 4: Docker

Build and run:
```bash
docker build -t skv-calendar .
docker run -p 3000:3000 skv-calendar
```

### Option 5: Cloud Platforms

**Heroku:**
```bash
heroku create your-app-name
git push heroku main
```

**Vercel:**
```bash
npm install -g vercel
vercel
```

**Railway:**
```bash
railway login
railway init
railway up
```

## Environment Variables

- `PORT` - Server port (default: 3000)

## Data Source

The calendar data is sourced from the Czech Floorball Federation XML feed:
- **Source**: https://data.ceskyflorbal.cz/
- **Format**: XML
- **Update Frequency**: Every 6 hours
- **Timezone**: Europe/Prague

## Calendar Information

- **Name**: SKV C
- **Timezone**: Europe/Prague
- **Event Duration**: 90 minutes (default for floorball matches)
- **Status**: All events marked as confirmed

## Troubleshooting

### Common Issues

1. **No events showing**: Check if the XML feed is accessible and contains data
2. **Timezone issues**: Verify the timezone is set correctly for your location
3. **Calendar not updating**: Check the server logs for errors

### Logs

The application logs important events:
- XML fetch attempts
- Event parsing results
- Cache updates
- Error messages

### Health Check

Visit `/health` to check the application status:
```json
{
  "status": "ok",
  "lastUpdate": "2025-01-20T10:30:00.000Z",
  "hasCachedData": true
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the logs
3. Create an issue in the repository

---

**Note**: This application is designed specifically for the SKV C floorball team and the Czech Floorball Federation data format. Modifications may be needed for other teams or data sources.

