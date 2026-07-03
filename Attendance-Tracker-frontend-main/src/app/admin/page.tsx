export default function AdminDashboardPage() {
  return (
    <div className="max-w-5xl">
      <h3 className="text-2xl font-bold tracking-tight text-zinc-950 mb-2">Admin Overview</h3>
      <p className="text-sm text-zinc-500 mb-6">
        Manage Founders' Club meetings, generate QR codes, and export attendance records.
      </p>
      
      {/* Sandbox note for Person 5 */}
      <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-12 text-center shadow-sm">
        <h4 className="text-lg font-medium text-zinc-900 mb-2">Hello, Person 5!</h4>
        <p className="text-sm text-zinc-600">
          Person 2 has set up your routing. You can build out the admin panels and permissions checks in this directory.
        </p>
      </div>
    </div>
  );
}