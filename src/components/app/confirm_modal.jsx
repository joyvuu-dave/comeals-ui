import { Component } from "react";
import Modal from "react-modal";

Modal.setAppElement("#root");

class ConfirmModal extends Component {
  render() {
    return (
      <Modal
        isOpen={this.props.isOpen}
        onRequestClose={this.props.onCancel}
        contentLabel="Confirm"
        style={{
          overlay: { zIndex: 10001 },
          content: {
            top: "50%",
            left: "50%",
            right: "auto",
            bottom: "auto",
            marginRight: "-50%",
            transform: "translate(-50%, -50%)",
            maxWidth: "24rem",
            padding: "1.5rem",
          },
        }}
      >
        <p style={{ marginTop: 0, marginBottom: "1.5rem", fontSize: "1rem" }}>
          {this.props.message}
        </p>
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            className="button-light"
            onClick={this.props.onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="button-warning"
            onClick={this.props.onConfirm}
          >
            Delete
          </button>
        </div>
      </Modal>
    );
  }
}

export default ConfirmModal;
