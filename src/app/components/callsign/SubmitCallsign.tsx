"use client";

import {zodResolver} from "@hookform/resolvers/zod";
import {useEffect, useState} from "react";
import {useForm} from "react-hook-form";
import {Check, ChevronsUpDown} from "lucide-react";
import {z} from "zod";
import {Client} from "appwrite";

import {cn} from "@/lib/utils";
import {Button} from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";

// Appwrite Configuration
const client = new Client()
    .setEndpoint("https://db.vikramk.dev/v1")
    .setProject("67b52781000b36607bb9");

const DATABASE_ID = "67b5295900277f82afc0";
const COLLECTION_ID = "67be4ef9002608d5b5d2";

const operators = [
    {label: "VU4N", value: "VU4N"},
    {label: "VU7A", value: "VU7A"},
    // {label: "VU4K", value: "VU4K"},
    // {label: "VU4KV", value: "VU4KV"},
    // {label: "VU7KP", value: "VU7KP"},
    // {label: "VU4CB", value: "VU4CB"},
    // {label: "VU7AG", value: "VU7AG"},
    {label: "VU4A", value: "VU4A"},
    // {label: "8Q7KP", value: "8Q7KP"},
] as const;

const formSchema = z.object({
    callsign: z
        .string()
        .min(2, {message: "Callsign must be at least 2 characters."})
        .max(10, {message: "Callsign must be at most 10 characters."}),
    operator: z.string({required_error: "Please select an operator."}),
});

export default function SubmitCallsign() {
    const [status, setStatus] = useState<string | null>(null);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {callsign: "", operator: "VU4N"},
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setStatus("⏳ Queuing callsign...");
        try {
            const res = await fetch("/api/tools/callsign/queue", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    callsign: values.callsign,
                    operator: values.operator,
                }),
            });


            const data = await res.json();

            if (res.ok) {
                setProcessingId(data.id);
                setStatus("✅ Callsign queued. Waiting for processing...");
            } else {
                setStatus(`❌ Error: ${data.error}`);
            }
        } catch (error) {
            console.log(error);
            setStatus("❌ Failed to queue callsign.");
        }
    }

    useEffect(() => {
        if (!processingId) return;

        console.log("🔹 Subscribing to:", processingId);

        const unsubscribe = client.subscribe(
            `databases.${DATABASE_ID}.collections.${COLLECTION_ID}.documents.${processingId}`,
            (response) => {
                console.log("🔔 Realtime event received:", response);

                if (response.events.includes("databases.*.collections.*.documents.*.delete")) {
                    setStatus("✅ Callsign processed!");
                    setProcessingId(null);
                    clearTimeout(timeoutId); // Clear timeout on success
                }
            }
        );

        // Set a timeout for 45 seconds
        const timeoutId = setTimeout(() => {
            setStatus("⏳ Timeout reached. An unknown error has occurred.");
            console.log("Timeout reached. Unsubscribing from:", processingId);
            unsubscribe();
            setProcessingId(null);
        }, 45000);

        return () => {
            console.log("🔹 Unsubscribing from:", processingId);
            clearTimeout(timeoutId);
            unsubscribe();
        };
    }, [processingId]);

    return (
        <div className="border border-gray-700 bg-gray-900 p-6 rounded-lg shadow-lg max-w-md mx-auto">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Callsign Input */}
                    <FormField
                        control={form.control}
                        name="callsign"
                        render={({field}) => (
                            <FormItem>
                                <FormLabel className="text-gray-300">Callsign</FormLabel>
                                <FormControl>
                                    <Input
                                        {...field}
                                        className="w-full border border-gray-600 bg-gray-800 text-white rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </FormControl>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />

                    {/* Operator Dropdown */}
                    <FormField
                        control={form.control}
                        name="operator"
                        render={({field}) => (
                            <FormItem className="flex flex-col">
                                <FormLabel className="text-gray-300">DX Expedition</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant="outline"
                                                role="combobox"
                                                className={cn(
                                                    "w-full justify-between bg-gray-800 text-gray-300 border border-gray-600 hover:bg-gray-700",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                {field.value
                                                    ? operators.find((operator) => operator.value === field.value)
                                                        ?.label
                                                    : "Select operator"}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50"/>
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent
                                        className="w-full p-0 bg-gray-900 border border-gray-700 rounded-md">
                                        <Command>
                                            <CommandInput placeholder="Search operator..."/>
                                            <CommandList>
                                                <CommandEmpty>No operator found.</CommandEmpty>
                                                <CommandGroup>
                                                    {operators.map((operator) => (
                                                        <CommandItem
                                                            value={operator.label}
                                                            key={operator.value}
                                                            onSelect={() => {
                                                                form.setValue("operator", operator.value);
                                                            }}
                                                            className="hover:bg-gray-800 text-gray-300"
                                                        >
                                                            {operator.label}
                                                            <Check
                                                                className={cn(
                                                                    "ml-auto",
                                                                    operator.value === field.value
                                                                        ? "opacity-100 text-blue-400"
                                                                        : "opacity-0"
                                                                )}
                                                            />
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <FormMessage/>
                            </FormItem>
                        )}
                    />

                    {/* Submit Button */}
                    <Button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2 rounded-md transition"
                        disabled={!!processingId}
                    >
                        {processingId ? "Processing..." : "Submit"}
                    </Button>
                </form>
            </Form>

            {/* Alert Box */}
            {status && (
                <Alert className="mt-4 border border-gray-600 bg-gray-800 text-white">
                    <AlertTitle>Status</AlertTitle>
                    <AlertDescription>{status}</AlertDescription>
                </Alert>
            )}
        </div>
    );
}
