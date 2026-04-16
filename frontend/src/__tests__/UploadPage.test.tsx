import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UploadPage } from "@/pages/UploadPage";

// Mock the upload mutation
jest.mock("@/api/hooks", () => ({
  useUploadMutation: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
    error: null,
  }),
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    <MemoryRouter>{children}</MemoryRouter>
  </QueryClientProvider>
);

describe("UploadPage", () => {
  it("renders heading and drop zone", () => {
    render(<UploadPage />, { wrapper });
    expect(screen.getByText(/Photo to/i)).toBeInTheDocument();
    expect(screen.getByText(/Drag & drop/i)).toBeInTheDocument();
  });

  it("upload button is disabled initially", () => {
    render(<UploadPage />, { wrapper });
    expect(screen.getByRole("button", { name: /Upload & Continue/i })).toBeDisabled();
  });
});
