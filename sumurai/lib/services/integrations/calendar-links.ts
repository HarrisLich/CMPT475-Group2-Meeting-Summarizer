// Action Item object blueprint
interface ActionItem {
  id: string;
  priority: "high" | "medium" | "low";
  task: string;
  assignedTo: string;
}

// Entry point for creating meeting/calender event links
// TODO: Potential LLM pass to create a highly detailed event including:
//          - Title, Description, Date/Time, Members
export const createCalendarLink = (
  actionItem: ActionItem,
  type: 'google' | 'outlook'
): string => {
  const title = `Follow-up: ${actionItem.task}`;
  const description = `Action Item Follow-up\n\nTask: ${actionItem.task}\nPriority: ${actionItem.priority.toUpperCase()}\nAssigned to: ${actionItem.assignedTo}\n\nGenerated from AI Meeting Summary`;

  // default to 1 week from now, 1 hour duration
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 7); // 7 days from now
  startDate.setHours(10, 0, 0, 0); // 10:00 AM

  const endDate = new Date(startDate);
  endDate.setHours(11, 0, 0, 0); // 11:00 AM (1 hour meeting)

  if (type === 'google') {
    return createGoogleCalendarLink(title, description, startDate, endDate);
  } else {
    return createOutlookCalendarLink(title, description, startDate, endDate);
  }
};


// Construct Google Calendar URL
// Format: YYYYMMDDTHHMMSSZ
function createGoogleCalendarLink(
  title: string,
  description: string,
  startDate: Date,
  endDate: Date
): string {
  const baseUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE';

  const formatGoogleDate = (date: Date): string => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  };

  const dates = `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`;

  const params = new URLSearchParams({
    text: title,
    details: description,
    dates: dates,
  });

  return `${baseUrl}&${params.toString()}`;
}


// Construct Outlook Calendar URL
// Format: ISO 8601
function createOutlookCalendarLink(
  title: string,
  description: string,
  startDate: Date,
  endDate: Date
): string {
  const baseUrl = 'https://outlook.live.com/calendar/0/deeplink/compose';

  const params = new URLSearchParams({
    subject: title,
    body: description,
    startdt: startDate.toISOString(),
    enddt: endDate.toISOString(),
    path: '/calendar/action/compose',
  });

  return `${baseUrl}?${params.toString()}`;
}


// .ics file constructor
// generic calender event file (IOS Calender, Thunderbird)
export const createICalFile = (actionItem: ActionItem): string => {
  const title = `Follow-up: ${actionItem.task}`;
  const description = `Task: ${actionItem.task}\\nPriority: ${actionItem.priority.toUpperCase()}\\nAssigned to: ${actionItem.assignedTo}`;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 7);
  startDate.setHours(10, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setHours(11, 0, 0, 0);

  const formatICalDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//SumurAI//Meeting Action Items//EN
BEGIN:VEVENT
UID:${actionItem.id}@sumurai.app
DTSTAMP:${formatICalDate(new Date())}
DTSTART:${formatICalDate(startDate)}
DTEND:${formatICalDate(endDate)}
SUMMARY:${title}
DESCRIPTION:${description}
PRIORITY:${actionItem.priority === 'high' ? '1' : actionItem.priority === 'medium' ? '5' : '9'}
STATUS:TENTATIVE
END:VEVENT
END:VCALENDAR`;

  return icsContent;
};


// Download .ics
export const downloadICalFile = (actionItem: ActionItem): void => {
  const icsContent = createICalFile(actionItem);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `action-item-${actionItem.id}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};