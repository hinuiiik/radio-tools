import SubmitCallsign from "@/app/components/callsign/SubmitCallsign";
import CallsignListBox from "@/app/components/callsign/CallsignListBox";

export default function Root() {
    return (
        <div className="flex flex-col justify-center items-center">
            <h1 className="text-2xl font-bold text-white mb-6">W4VKU LoTW Self Service</h1>

            <div className="flex flex-col md:flex-row gap-8">
                <div className="w-full md:w-1/2 min-w-[20em]">
                    <SubmitCallsign />
                </div>
                <div className="w-full md:w-1/2 min-w-[23em]">
                    <CallsignListBox />
                </div>
            </div>
        </div>
    );
}
