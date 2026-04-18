import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DropZone } from "@/components/DropZone";

describe("DropZone", () => {
  it("renders upload prompt", () => {
    render(<DropZone onFile={jest.fn()} />);
    expect(screen.getByText(/Drag & drop/i)).toBeInTheDocument();
  });

  it("renders Browse files and Take photo buttons", () => {
    render(<DropZone onFile={jest.fn()} />);
    expect(screen.getByRole("button", { name: /Browse files/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Take photo/i })).toBeInTheDocument();
  });

  it("calls onFile with a valid image", async () => {
    const onFile = jest.fn();
    render(<DropZone onFile={onFile} />);
    const input = document.querySelector("input[type=file]") as HTMLInputElement;
    const file = new File(["pixels"], "photo.jpg", { type: "image/jpeg" });
    await userEvent.upload(input, file);
    expect(onFile).toHaveBeenCalledWith(file);
  });

  it("shows error for non-image file", () => {
    render(<DropZone onFile={jest.fn()} />);
    const input = document.querySelector("input[type=file]") as HTMLInputElement;
    const file = new File(["data"], "doc.pdf", { type: "application/pdf" });
    // Use fireEvent to bypass the browser-level accept attribute filtering
    fireEvent.change(input, { target: { files: [file] } });
    expect(screen.getByText(/Only image files/i)).toBeInTheDocument();
  });

  it("camera input has capture attribute for mobile", () => {
    render(<DropZone onFile={jest.fn()} />);
    const cameraInput = document.querySelector("input[capture]") as HTMLInputElement;
    expect(cameraInput).not.toBeNull();
    expect(cameraInput.getAttribute("capture")).toBe("environment");
    expect(cameraInput.getAttribute("accept")).toBe("image/*");
  });
});
