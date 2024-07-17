import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from 'zod';
import { prisma } from "../lib/prisma";
import { dayjs } from "../lib/dayjs";
import { ClientError } from "../errors/client-error";

export async function updateTrip(app: FastifyInstance) {
    app.withTypeProvider<ZodTypeProvider>().put('/trips/:tripId', {
        schema: {
            params: z.object({
                tripId: z.string().uuid()
            }),
            body: z.object({
                destination: z.string().min(4),
                starts_at: z.coerce.date(),
                ends_at: z.coerce.date(),
            })
        }
    }, async(request) => {
        const { tripId } = request.params;
        const { destination, starts_at, ends_at } = request.body;

        const trip = await prisma.trip.findUnique({
            where: { id: tripId }
        })

        if (!trip) {
            throw new ClientError('Trip not found.')
        }

        if (dayjs(starts_at).startOf('day').isBefore(dayjs(new Date()).startOf('day'))) {
            throw new ClientError("Invalid trip start date")
        }

        if (dayjs(ends_at).startOf('day').isBefore(dayjs(starts_at).startOf('day'))) {
            throw new ClientError("Invalid trip end date")
        }

        const activitiesTrip = await prisma.activity.findMany({
            select: {
                id: true,
                occurs_at: true,
            },
            where: { trip_id: tripId }
        })

        const deleteActivitiesNoRange = async (activityId: string) => {
            await prisma.activity.delete({ where: { id: activityId }})
        }

        activitiesTrip.map(activity => {
            if (dayjs(activity.occurs_at).startOf('day').isBefore(dayjs(starts_at).startOf('day'))) {
                deleteActivitiesNoRange(activity.id)
            }

            if (dayjs(activity.occurs_at).startOf('day').isAfter(dayjs(ends_at).startOf('day'))) {
                deleteActivitiesNoRange(activity.id)
            }
        })

        await prisma.trip.update({
            where: { id: tripId },
            data: {
                destination,
                 starts_at,
                 ends_at
            }
        })

        return { tripId: trip.id}
    })
}