export const getYesterdayDate = (
    format: 'yyyy-mm-dd' | 'dd-mm-yyyy' = 'yyyy-mm-dd',
): string => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const year = yesterday.getFullYear();
    const month = String(yesterday.getMonth() + 1).padStart(2, '0');
    const day = String(yesterday.getDate()).padStart(2, '0');

    if (format === 'dd-mm-yyyy') {
        return `${day}-${month}-${year}`;
    }

    return `${year}-${month}-${day}`;
};
