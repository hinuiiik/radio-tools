import {NextRequest, NextResponse} from "next/server";
import {Client, Databases, ID, Query} from "node-appwrite";

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT!)
    .setProject(process.env.APPWRITE_PROJ_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);
const APPWRITE_QSO_DATABASE_ID = process.env.APPWRITE_QSO_DATABASE_ID!;
const APPWRITE_QSO_QUEUE_COLLECTION_ID = process.env.APPWRITE_QSO_QUEUE_COLLECTION_ID!;
const APPWRITE_QSO_LOGS_COLLECTION_ID = process.env.APPWRITE_QSO_LOGS_COLLECTION_ID!;
const APPWRITE_QSO_COMPLETE_COLLECTION_ID = process.env.APPWRITE_QSO_COMPLETE_COLLECTION_ID!;

const rateLimitMap = new Map<string, number[]>(); // Stores IPs with their request timestamps

export async function POST(req: NextRequest) {
    try {
        let {callsign, operator} = await req.json();

        if (!callsign || !operator) {
            return NextResponse.json({error: "Missing callsign or operator"}, {status: 400});
        }

        // Normalize input
        callsign = callsign.trim().toUpperCase();
        operator = operator.trim().toUpperCase();

        // Validate length
        if (callsign.length < 2 || callsign.length > 10 || operator.length < 2 || operator.length > 10) {
            return NextResponse.json({error: "Invalid callsign or operator length"}, {status: 400});
        }

        // Ensure alphanumeric
        const alphanumericRegex = /^[a-zA-Z0-9]+$/;
        if (!alphanumericRegex.test(callsign) || !alphanumericRegex.test(operator)) {
            return NextResponse.json({error: "Callsign and operator must be alphanumeric"}, {status: 400});
        }

        // Rate limiting
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
        const now = Date.now();
        const timestamps = rateLimitMap.get(ip) || [];

        // Filter timestamps from the last minute
        const recentTimestamps = timestamps.filter((t) => now - t < 60000);

        if (recentTimestamps.length >= 5) {
            return NextResponse.json({error: "Rate limit exceeded. Max 5 callsigns per minute."}, {status: 429});
        }

        // Update rate limit map
        recentTimestamps.push(now);
        rateLimitMap.set(ip, recentTimestamps);

        // Check if already processed
        const processedResponse = await databases.listDocuments(APPWRITE_QSO_DATABASE_ID, APPWRITE_QSO_COMPLETE_COLLECTION_ID, [
            Query.equal("callsign", callsign),
            Query.equal("operator", operator),
        ]);
        if (processedResponse.documents.length > 0) {
            return NextResponse.json({error: "Callsign already processed"}, {status: 409});
        }

        // Ensure callsign exists in main log
        const existingResponse = await databases.listDocuments(APPWRITE_QSO_DATABASE_ID, APPWRITE_QSO_LOGS_COLLECTION_ID, [
            Query.equal("callsign", callsign),
            Query.equal("operator", operator),
        ]);
        if (existingResponse.documents.length === 0) {
            return NextResponse.json({error: "Callsign not found"}, {status: 404});
        }

        // Add to queue
        const document = await databases.createDocument(APPWRITE_QSO_DATABASE_ID, APPWRITE_QSO_QUEUE_COLLECTION_ID, ID.unique(), {
            callsign,
            operator,
        });

        console.log("Queued:", document.$id, callsign, operator);

        return NextResponse.json({message: "Callsign queued", id: document.$id}, {status: 201});

    } catch (error) {
        console.error(error);
        return NextResponse.json({error: "Failed to queue"}, {status: 500});
    }
}
