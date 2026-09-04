export function downloadCalendarEvent(title: string, description: string, dueDate: string, location: string = 'LIFEOS Operations Assistant'): void {
  try {
    const cleanTitle = title.replace(/[\n\r]/g, ' ');
    const cleanDesc = description.replace(/[\n\r]/g, '\\n');
    
    // Parse date
    const dateObj = new Date(dueDate);
    const startStr = isNaN(dateObj.getTime())
      ? new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
      : dateObj.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      
    // End date 1 hour later
    const endDateObj = isNaN(dateObj.getTime()) ? new Date(Date.now() + 3600000) : new Date(dateObj.getTime() + 3600000);
    const endStr = endDateObj.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//LIFEOS//Personal AI Operations Assistant//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${Date.now()}@lifeos.assistant`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART:${startStr}`,
      `DTEND:${endStr}`,
      `SUMMARY:${cleanTitle}`,
      `DESCRIPTION:${cleanDesc}`,
      `LOCATION:${location}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-PT24H',
      'ACTION:DISPLAY',
      `DESCRIPTION:Reminder: ${cleanTitle}`,
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export calendar event:', error);
  }
}
