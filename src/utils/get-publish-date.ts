import dayjs from "dayjs";

type GetPublishDateParams = {
    notBefore?: Date;
    addHours?: number;
}

const restrictedHours = [0, 1, 2, 3, 4, 5, 6, 7, 8, 23];

export async function getPublishDate({ notBefore, addHours = 0 }: GetPublishDateParams): Promise<Date> {
    const now = new Date();
    if (notBefore && notBefore > now) {
        return notBefore;
    }

    const publishDate = dayjs().add(addHours, 'hours').startOf('hour').toDate();

    const publishHour = publishDate.getHours();
    if (restrictedHours.includes(publishHour)) {
        const nextAllowedHour = restrictedHours.find(hour => hour > publishHour) ?? 10;
        const hoursToAdd = (nextAllowedHour - publishHour + 24) % 24;
        return dayjs(publishDate).add(hoursToAdd, 'hours').toDate();
    }

    return publishDate;
}