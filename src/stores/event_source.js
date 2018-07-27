import { types } from "mobx-state-tree";

const EventSource = types.model("EventSource", {
  url: types.string,
  color: types.maybeNull(types.string)
});

export default EventSource;
