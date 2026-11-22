export const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const shortDate = (d: string) => `${Number(d.slice(8, 10))} ${MONTH[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`;
