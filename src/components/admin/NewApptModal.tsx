"use client";

type ApptForm = {
  customer: string;
  date: string;
  time: string;
  type: string;
};

type Props = {
  apptForm: ApptForm;
  setApptForm: React.Dispatch<React.SetStateAction<ApptForm>>;
  onClose: () => void;
};

export function NewApptModal({ apptForm, setApptForm, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="bg-white rounded-md p-5 w-full max-w-md mx-4 space-y-4" style={{ border: "1px solid #ECEEF1", boxShadow: "0 12px 36px rgba(26,23,20,0.18)" }}>
        <h3 className="font-black text-lg uppercase tracking-wide text-text-light">New Notary Appointment</h3>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-light/50 mb-1 block">Customer Name</label>
            <input type="text" value={apptForm.customer} onChange={(e) => setApptForm((p) => ({ ...p, customer: e.target.value }))} placeholder="Full name" className="w-full rounded-xl border border-border-light px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1976FF]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-light/50 mb-1 block">Date</label>
              <input type="date" value={apptForm.date} onChange={(e) => setApptForm((p) => ({ ...p, date: e.target.value }))} className="w-full rounded-xl border border-border-light px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1976FF]" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-light/50 mb-1 block">Time</label>
              <input type="time" value={apptForm.time} onChange={(e) => setApptForm((p) => ({ ...p, time: e.target.value }))} className="w-full rounded-xl border border-border-light px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1976FF]" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-light/50 mb-1 block">Document Type</label>
            <select value={apptForm.type} onChange={(e) => setApptForm((p) => ({ ...p, type: e.target.value }))} className="w-full rounded-xl border border-border-light px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1976FF] bg-white">
              <option value="Acknowledgment">Acknowledgment</option>
              <option value="Jurat">Jurat</option>
              <option value="Power of Attorney">Power of Attorney</option>
              <option value="Deed">Deed</option>
              <option value="Affidavit">Affidavit</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => { onClose(); setApptForm({ customer: "", date: "", time: "", type: "Acknowledgment" }); }}
            disabled={!apptForm.customer || !apptForm.date || !apptForm.time}
            className="flex-1 px-4 h-10 rounded-md text-[12px] font-bold uppercase tracking-[0.10em] text-white disabled:opacity-40 transition-colors"
            style={{ background: "#1A1D23", border: "1px solid #1A1D23" }}
          >
            Schedule appointment
          </button>
          <button onClick={onClose} className="flex-1 px-4 h-10 rounded-md text-[12px] font-bold uppercase tracking-[0.10em] transition-colors" style={{ background: "#FFFFFF", color: "#3B4252", border: "1px solid #ECEEF1" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
