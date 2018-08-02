import { types, getParent } from "mobx-state-tree";

const Guest = types
  .model("Guest", {
    id: types.identifierNumber,
    created_at: types.Date,
    meal_id: types.number,
    resident_id: types.number,
    name: types.maybeNull(types.string),
    vegetarian: false
  })
  .views(self => ({
    get form() {
      return getParent(self, 2);
    }
  }));

export default Guest;
