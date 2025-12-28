export const generateDateStamp = () => {
  const now = new Date();

  // Use Intl.DateTimeFormat to get the date parts in the specific timezone
  const formatter = new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false, // Use 24-hour format
    timeZone: "Australia/Sydney"
  });

  // Format the date and manually reconstruct the YYYYMMDDHHmmss string
  // The output from formatter.format() will be in "DD/MM/YYYY, HH:mm:ss" format due to 'en-US' locale
  const parts = formatter.format(now).split(', ');
  const dateParts = parts[0].split('/');

  const year = dateParts[2];
  const month = dateParts[1];
  const day = dateParts[0];

  return `${year}${month}${day}`;
}