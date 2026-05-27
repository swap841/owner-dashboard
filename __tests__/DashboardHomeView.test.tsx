import { render, screen, waitFor } from "@testing-library/react";
import DashboardHomeView from "@/components/DashboardHomeView";

const mockGetDocs = jest.fn();
const mockCollection = jest.fn();
const mockQuery = jest.fn();
const mockWhere = jest.fn();

const mockCollectionGroup = jest.fn(() => ({
  withConverter: jest.fn().mockReturnThis(),
}));

jest.mock("firebase/firestore", () => ({
  collection: (...args: any[]) => mockCollection(...args),
  collectionGroup: (...args: any[]) => mockCollectionGroup(...args),
  query: (...args: any[]) => mockQuery(...args),
  where: (...args: any[]) => mockWhere(...args),
  getDocs: (...args: any[]) => mockGetDocs(...args),
  getFirestore: jest.fn(() => ({})),
}));

jest.mock("../firebaseConfig", () => ({
  app: {},
}));

function makeDoc(id: string, data: Record<string, any>) {
  return { id, data: () => data };
}

describe("DashboardHomeView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows loading spinner initially", () => {
    mockGetDocs.mockReturnValue(new Promise(() => {}));
    render(<DashboardHomeView />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders KPI cards after loading", async () => {
    mockGetDocs.mockImplementation((q: any) => {
      const calls = mockGetDocs.mock.calls.length;
      return Promise.resolve({ size: calls, docs: [] });
    });

    mockGetDocs
      .mockResolvedValueOnce({ size: 5, docs: [] }) // pending orders
      .mockResolvedValueOnce({ size: 3, docs: [] }) // today orders
      .mockResolvedValueOnce({ docs: [] }) // products
      .mockResolvedValueOnce({ size: 4, docs: [] }) // workers
      .mockResolvedValueOnce({ size: 2, docs: [] }) // delivery boys
      .mockResolvedValueOnce({ size: 1, docs: [] }) // tickets
      .mockResolvedValueOnce({ size: 0, docs: [] }); // contacts

    render(<DashboardHomeView />);

    await waitFor(() => {
      expect(screen.getByText("Dashboard Home")).toBeInTheDocument();
    });

    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("₹3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("renders low stock count correctly", async () => {
    mockGetDocs
      .mockResolvedValueOnce({ size: 0, docs: [] })
      .mockResolvedValueOnce({ size: 0, docs: [] })
      .mockResolvedValueOnce({
        docs: [
          makeDoc("p1", { stock: 2, lowStockThreshold: 5 }),
          makeDoc("p2", { stock: 10, lowStockThreshold: 5 }),
          makeDoc("p3", { stock: 0, lowStockThreshold: 3 }),
        ],
      })
      .mockResolvedValueOnce({ size: 0, docs: [] })
      .mockResolvedValueOnce({ size: 0, docs: [] })
      .mockResolvedValueOnce({ size: 0, docs: [] })
      .mockResolvedValueOnce({ size: 0, docs: [] });

    render(<DashboardHomeView />);

    await waitFor(() => {
      expect(screen.getByText("Low Stock Items")).toBeInTheDocument();
    });

    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("renders today's revenue from totalAmount", async () => {
    mockGetDocs
      .mockResolvedValueOnce({ size: 0, docs: [] })
      .mockResolvedValueOnce({
        size: 2,
        docs: [
          makeDoc("o1", { totalAmount: 150 }),
          makeDoc("o2", { totalAmount: 75.5 }),
        ],
      })
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({ size: 0, docs: [] })
      .mockResolvedValueOnce({ size: 0, docs: [] })
      .mockResolvedValueOnce({ size: 0, docs: [] })
      .mockResolvedValueOnce({ size: 0, docs: [] });

    render(<DashboardHomeView />);

    await waitFor(() => {
      expect(screen.getByText("₹226")).toBeInTheDocument();
    });
  });

  it("renders quick action buttons", async () => {
    mockGetDocs
      .mockResolvedValue({ size: 0, docs: [] });

    render(<DashboardHomeView />);

    await waitFor(() => {
      expect(screen.getByText("Add Product")).toBeInTheDocument();
    });

    expect(screen.getByText("View Orders")).toBeInTheDocument();
    expect(screen.getByText("Dispatch Baskets")).toBeInTheDocument();
    expect(screen.getByText("Manage Workers")).toBeInTheDocument();
  });

  it("handles fetch error gracefully", async () => {
    mockGetDocs.mockRejectedValue(new Error("firebase error"));

    render(<DashboardHomeView />);

    await waitFor(() => {
      expect(screen.getByText("Dashboard Home")).toBeInTheDocument();
    });
  });
});
