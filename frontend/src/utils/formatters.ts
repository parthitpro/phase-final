export const getLocalDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatDisplayDate = (dateStr: string | Date) => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr.toString();
  const day = d.getDate().toString().padStart(2, '0');
  const month = d.toLocaleDateString('en-US', { month: 'long' });
  const year = d.getFullYear().toString().slice(-2);
  return `${day}-${month}-${year}`;
};

export const toISODate = (date: string | Date) => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const day = d.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatWeight = (weight: number) => {
  return parseFloat(weight.toFixed(3)).toString();
};
