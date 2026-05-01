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
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 space-y-4" style={{ boxShadow: "0 8px 40px rgba(26,23,20,0.2)" }}>
        <h3 className="font-black text-lg uppercase tracking-wide text-text-light">New Notary Appointment</h3>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-light/50 mb-1 block">Customer Name</label>
            <input type="text" value={apptForm.customer} onChange={(e) => setApptForm((p) => ({ ...p, customer: e.target.value }))} placeholder="Full name" className="w-full rounded-xl border border-border-light px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#337485]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-light/50 mb-1 block">Date</label>
              <input type="date" value={apptForm.date} onChange={(e) => setApptForm((p) => ({ ...p, date: e.target.value }))} className="w-full rounded-xl border border-border-light px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#337485]" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-text-light/50 mb-1 block">Time</label>
              <input type="time" value={apptForm.time} onChange={(e) => setApptForm((p) => ({ ...p, time: e.target.value }))} className="w-full rounded-xl border border-border-light px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#337485]" />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-light/50 mb-1 block">Document Type</label>
            <select value={apptForm.type} onChange={(e) => setApptForm((p) => ({ ...p, type: e.target.value }))} className="w-full rounded-xl border border-border-light px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#337485] bg-white">
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
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-black text-white disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #337485, #23596A)", boxShadow: "0 2px 10px rgba(51,116,133,0.3)" }}
          >
            Schedule Appointment
          </button>
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-text-light" style={{ border: "1px solid rgba(232,229,224,0.7)" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
