"use client";

import {useEffect, useState} from "react";
import {Client, Databases, Query} from "appwrite";
import {ColumnDef} from "@tanstack/react-table";
import {DataTable} from "@/components/ui/data-table";
import {format} from "date-fns";

const client = new Client()
    .setEndpoint("https://db.vikramk.dev/v1")
    .setProject("67b52781000b36607bb9");

const databases = new Databases(client);
const DATABASE_ID = "67b5295900277f82afc0";
const COLLECTION_ID = "67bf87b80015cb237b87";

interface CallsignEntry {
    $id: string;
    callsign: string;
    operator: string;
    time: string;
}

export default function CallsignListBox() {
    const [data, setData] = useState<CallsignEntry[]>([]);

    // Fetch initial data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID, [
                    Query.limit(10)
                ]);

                const reversedData = response.documents
                    .map((doc) => doc as unknown as CallsignEntry)
                    .reverse();
                setData(reversedData);
            } catch (error) {
                console.error("Failed to fetch data:", error);
            }
        };

        fetchData();


        const unsubscribe = client.subscribe(
            `databases.${DATABASE_ID}.collections.${COLLECTION_ID}.documents`,
            (response) => {
                if (response.events.includes("databases.*.collections.*.documents.*.create")) {
                    setData((prev) => {
                        const updatedData = [response.payload as CallsignEntry, ...prev];
                        return updatedData.slice(0, 10);
                    });
                }
            }
        );

        return () => unsubscribe();
    }, []);

    const columns: ColumnDef<CallsignEntry>[] = [
        {
            accessorKey: "callsign",
            header: "Callsign",
        },
        {
            accessorKey: "operator",
            header: "Operator",
        },
        {
            accessorKey: "time",
            header: "Time",
            cell: ({row}) => format(new Date(row.original.time), "yyyy-MM-dd HH:mm:ss"),
        },
    ];

    return (
        <div className="border border-gray-700 bg-gray-900 p-4 rounded-lg shadow-lg">
            <h2 className="text-white text-lg font-semibold mb-4">Latest Callsigns</h2>
            <DataTable columns={columns} data={data}/>
        </div>
    );
}
