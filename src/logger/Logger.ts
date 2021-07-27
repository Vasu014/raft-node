import * as winston from 'winston';
const { combine, timestamp, printf, prettyPrint } = winston.format;


const formattedDate = () => {
    return new Date().toLocaleString('en-US', {
        formatMatcher: 'best fit',
        timeZone: 'Asia/Kolkata'
    });
}
const myFormat = printf(({ level, message, timestamp }) => {
    return `${timestamp} ${level}: ${message}`;
});

const logger = winston.createLogger({
    level: 'info',
    format: combine(
        timestamp({ format: formattedDate }),
        myFormat
    ),
    transports: [
        new winston.transports.Console(),
    ]
});

export { logger }