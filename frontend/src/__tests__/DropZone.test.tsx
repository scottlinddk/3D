import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DropZone } from "@/components/DropZone";

describe("DropZone", () => {
  it("renders upload prompt", () => {
    render(<DropZone onFile={jest.fn()} />);
    expect(screen.getByText(/Drag & drop/i)).toBeInTheDocument();
  });

  it("calls onFile with a valid image", async () => {
    const onFile = jest.fn();
    render(<DropZone onFile={onFile} />);
    const input = document.querySelector("input[type=file]") as HTMLInputElement;
    const file = new File(["pixels"], "photo.jpg", { type: "image/jpeg" });
    await userEvent.upload(input, file);
    expect(onFile).toHaveBeenCalledWith(file);
  });

  it("shows error for non-image file", async () => {
    render(<DropZone onFile={jest.fn()} />);
    const input = document.querySelector("input[type=file]") as HTMLInputElement;
    const file = new File(["data"], "doc.pdf", { type: "application/pdf" });
    await userEvent.upload(input, file);
    expect(screen.getByText(/Only image files/i)).toBeInTheDocument();
  });
});
