import QRDisplay from "@/components/admin/QRDisplay";
import { getMeeting } from "@/services/meetings";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MeetingQRPage({ params }: Props) {
  const { id } = await params;
  
  // Fetch meeting info from database
  const { data: meeting, error } = await getMeeting(id);

  if (error || !meeting) {
    return notFound();
  }

  const isNotStarted = !meeting.actual_start_at && meeting.status !== "closed";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8 bg-[#F7F8FC]">
      <div className="text-center max-w-xl space-y-3">
        <span className="inline-block bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full border border-blue-200 uppercase tracking-wider">
          {meeting.type} Meeting
        </span>
        <h1 className="text-4xl font-extrabold text-[#14213D] tracking-tight sm:text-5xl">
          {meeting.title}
        </h1>
        {meeting.agenda && (
          <p className="text-zinc-500 text-sm max-w-md mx-auto leading-relaxed">
            &ldquo;{meeting.agenda}&rdquo;
          </p>
        )}
      </div>

      <div className="bg-white rounded-3xl p-10 border border-zinc-100 shadow-xl flex flex-col items-center justify-center min-w-[340px] min-h-[380px]">
        {isNotStarted ? (
          <div className="flex flex-col items-center justify-center text-center gap-3 p-4">
            <span className="text-5xl animate-bounce">⏱️</span>
            <h2 className="text-lg font-bold text-zinc-800">Meeting Not Started</h2>
            <p className="text-xs text-zinc-400 max-w-[240px] leading-relaxed">
              The QR code generation is waiting. Please start the meeting session from the admin dashboard to generate and display the code.
            </p>
          </div>
        ) : (
          <QRDisplay 
            meetingId={meeting.id} 
            windowMinutes={meeting.time_limit_minutes} 
            actualStartAt={meeting.actual_start_at}
          />
        )}
      </div>

      <div className="text-center space-y-1 text-xs text-zinc-400 font-mono">
        <p>Meeting ID: {meeting.id}</p>
        <p>Date: {meeting.date ? new Date(meeting.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—"}</p>
      </div>
    </main>
  );
}
