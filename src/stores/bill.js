import { types, getParent } from "mobx-state-tree";
import Resident from "./resident";

const Bill = types
  .model("Bill", {
    id: types.identifier,
    resident: types.maybeNull(types.reference(Resident)),
    amount: "",
    no_cost: false
  })
  .views(self => ({
    get resident_id() {
      return self.resident && self.resident.id ? self.resident.id : "";
    },
    get amountIsValid() {
      const num = Number(self.amount);
      return !isNaN(num) && num >= 0;
    },
    get form() {
      return getParent(self, 2);
    }
  }))
  .actions(self => ({
    setResident(val) {
      if (val === "") {
        self.resident = null;
        self.form.form.toggleEditBillsMode();
        self.form.form.toggleEditBillsMode();
        return null;
      } else {
        self.resident = val;
        self.form.form.toggleEditBillsMode();
        self.form.form.toggleEditBillsMode();
        return self.resident;
      }
    },
    setAmount(val) {
      self.amount = val;
      self.form.form.toggleEditBillsMode();
      self.form.form.toggleEditBillsMode();
      return val;
    },
    toggleNoCost() {
      const val = !self.no_cost;
      self.no_cost = val;
      self.form.form.toggleEditBillsMode();
      self.form.form.toggleEditBillsMode();
      return val;
    }
  }));

export default Bill;
