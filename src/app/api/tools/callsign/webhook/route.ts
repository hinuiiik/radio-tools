import {NextRequest, NextResponse} from "next/server";
import {Client, Databases, Query, ID} from "node-appwrite";
import crypto from "crypto";
import {exec} from "child_process";

const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT!)
    .setProject(process.env.APPWRITE_PROJ_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);
const APPWRITE_QSO_DATABASE_ID = process.env.APPWRITE_QSO_DATABASE_ID!;
const APPWRITE_QSO_QUEUE_COLLECTION_ID = process.env.APPWRITE_QSO_QUEUE_COLLECTION_ID!;
const APPWRITE_QSO_WEBHOOK_SIG_KEY = process.env.APPWRITE_QSO_WEBHOOK_SIG_KEY!;
const APPWRITE_QSO_LOGS_COLLECTION_ID = process.env.APPWRITE_QSO_LOGS_COLLECTION_ID!;
const APPWRITE_QSO_COMPLETE_COLLECTION_ID = process.env.APPWRITE_QSO_COMPLETE_COLLECTION_ID!;
const APPWRITE_QSO_ERRORS_COLLECTION_ID = process.env.APPWRITE_QSO_ERRORS_COLLECTION_ID!;
const APPWRITE_QSO_WEBHOOK_URL = process.env.APPWRITE_QSO_WEBHOOK_URL!;

// Verify webhook
async function verifySignature(req: NextRequest, body: string) {
    const signatureHeader = req.headers.get("x-appwrite-webhook-signature");

    if (!signatureHeader) return false;

    const expectedHmac = crypto.createHmac("sha1", APPWRITE_QSO_WEBHOOK_SIG_KEY).update(APPWRITE_QSO_WEBHOOK_URL + body).digest("base64");

    return signatureHeader === expectedHmac;
}

function getCommand(operator: string): string {
    // access the environment variable using the operator
    const command = process.env[`CMD_${operator}`];

    if (command) {
        return command;
    } else {
        return '';
    }
}


function executeShellCommand(text: string, callsign: string, operator: string): Promise<string> {
    const pass_str = getCommand(operator);
    exec(`echo "${text}" > temp.adi`);
    const command = `tqsl -x -a abort -d -u ${pass_str} temp.adi`;
    console.log(command);

    return new Promise((resolve, reject) => {
        exec(command, {timeout: 20000}, async (error, stdout, stderr) => {
            exec(`echo "${stdout}\n" >> diag.txt`);
            exec(`echo "${stderr}\n\n" >> diag.txt`);

            if (error) {
                console.error(`Shell command error for ${callsign}:`, stderr);

                // Log error in Appwrite database
                try {
                    await databases.createDocument(APPWRITE_QSO_DATABASE_ID, APPWRITE_QSO_ERRORS_COLLECTION_ID, ID.unique(), {
                        callsign,
                        operator,
                        error: stderr || error.message,
                        time: new Date(Date.now())
                    });
                } catch (dbError) {
                    console.error("Failed to log error to Appwrite:", dbError);
                }

                reject(`Error: ${stderr}`);
            } else {
                resolve(stdout.trim());
            }
        });
    });
}

async function fetchAndFormatQSO(callsign: string, operator: string): Promise<string> {
    const response = await databases.listDocuments(APPWRITE_QSO_DATABASE_ID, APPWRITE_QSO_LOGS_COLLECTION_ID, [
        Query.equal("callsign", callsign),
        Query.equal("operator", operator),
    ]);

    if (response.documents.length === 0) {
        return Promise.reject(`No QSO records found for callsign: ${callsign}`);
    }

    return response.documents.map(doc => doc.body).join("\n");
}


async function processQueue() {
    try {
        const response = await databases.listDocuments(APPWRITE_QSO_DATABASE_ID, APPWRITE_QSO_QUEUE_COLLECTION_ID, [
            Query.orderAsc("$createdAt"),
            Query.limit(1),
        ]);

        if (response.documents.length === 0) return null;

        const {$id, callsign, operator} = response.documents[0];

        console.log("Processing:", callsign);
        await new Promise((resolve) => setTimeout(resolve, 3000));

        try {
            // Fetch QSO data
            const text = await fetchAndFormatQSO(callsign, operator);

            // Execute shell command
            await executeShellCommand(text, callsign, operator);

            console.log("✅ Processed:", callsign);

            // Write to completed database
            await databases.createDocument(APPWRITE_QSO_DATABASE_ID, APPWRITE_QSO_COMPLETE_COLLECTION_ID, ID.unique(), {
                callsign,
                time: new Date(Date.now()),
                operator,
            });

            // Delete from queue database
            await databases.deleteDocument(APPWRITE_QSO_DATABASE_ID, APPWRITE_QSO_QUEUE_COLLECTION_ID, $id);

            return callsign;
        } catch (error) {
            console.error("Processing error:", error);
        }

    } catch (error) {
        console.error("Queue processing error:", error);
    }
    return null;
}

export async function POST(req: NextRequest) {
    const body = await req.text();

    // Validate webhook
    if (!(await verifySignature(req, body))) {
        return NextResponse.json({error: "Invalid webhook signature"}, {status: 403});
    }

    const processedCallsign = await processQueue();

    if (!processedCallsign) {
        return NextResponse.json({error: "No pending callsigns"}, {status: 200});
    }

    return NextResponse.json({message: `Processed: ${processedCallsign}`}, {status: 200});
}
