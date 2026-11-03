const adminDateFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric",
  hour: "2-digit", minute: "2-digit", hour12: true,
});

export const formatAdminDate = (value: string) => `${adminDateFormatter.format(new Date(value))} IST`;
