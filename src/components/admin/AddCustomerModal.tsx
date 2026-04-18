"use client";

type AddCustomerForm = {
  name: string;
  email: string;
  plan: string;
  suite: string;
};

type Props = {
  addCustomerForm: AddCustomerForm;
  setAddCustomerForm: React.Dispatch<React.SetStateAction<AddCustomerForm>>;
  handleAddCustomerSubmit: () => void;
  isPending: boolean;
  onClose: () => void;
};

export function AddCustomerModal({
  addCustomerForm,
  setAddCustomerForm,
  handleAddCustomerSubmit,
  isPending,
  onClose,
}: Props) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 space-y-4" style={{ boxShadow: "0 8px 40px rgba(26,23,20,0.2)" }}>
        <h3 className="font-black text-lg uppercase tracking-wide text-text-light">Add Customer</h3>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-light/50 mb-1 block">Name</label>
            <input
              type="text"
              value={addCustomerForm.name}
              onChange={(e) => setAddCustomerForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Full name"
              className="w-full rounded-xl border border-border-light px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3374B5]"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-light/50 mb-1 block">Email</label>
            <input
              type="email"
              value={addCustomerForm.email}
              onChange={(e) => setAddCustomerForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="email@example.com"
              className="w-full rounded-xl border border-border-light px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3374B5]"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-light/50 mb-1 block">Plan</label>
            <select
              value={addCustomerForm.plan}
              onChange={(e) => setAddCustomerForm((prev) => ({ ...prev, plan: e.target.value }))}
              className="w-full rounded-xl border border-border-light px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3374B5] bg-white"
            >
              <option value="Basic">Basic</option>
              <option value="Business">Business</option>
              <option value="Premium">Premium</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-light/50 mb-1 block">Suite Number</label>
            <input
              type="text"
              value={addCustomerForm.suite}
              onChange={(e) => setAddCustomerForm((prev) => ({ ...prev, suite: e.target.value }))}
              placeholder="e.g. 205"
              className="w-full rounded-xl border border-border-light px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3374B5]"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleAddCustomerSubmit}
            disabled={isPending || !addCustomerForm.name || !addCustomerForm.email || !addCustomerForm.suite}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-black text-white disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #3374B5, #2055A0)", boxShadow: "0 2px 10px rgba(51,116,181,0.3)" }}
          >
            {isPending ? "Creating..." : "Add Customer"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-text-light"
            style={{ border: "1px solid rgba(232,229,224,0.7)" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
