import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    currentPage: number;
    totalRows: number;
    rowsPerPage: number;
    onPageChange: (page: number) => void;
    onRowsPerPageChange: (rows: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalRows,
    rowsPerPage,
    onPageChange,
    onRowsPerPageChange
}) => {
    const totalPages = Math.ceil(totalRows / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage + 1;
    const endIndex = Math.min(currentPage * rowsPerPage, totalRows);

    return (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4 text-sm text-slate-600">
            <div className="flex items-center gap-2">
                <span>Tampilkan</span>
                <select 
                    className="border border-slate-200 rounded-md p-1 outline-none focus:ring-2 focus:ring-indigo-100"
                    value={rowsPerPage}
                    onChange={(e) => {
                        onRowsPerPageChange(Number(e.target.value));
                        onPageChange(1); // Reset to first page when changing rows per page
                    }}
                >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={300}>300</option>
                    <option value={500}>500</option>
                </select>
                <span>baris per halaman</span>
            </div>

            <div className="flex items-center gap-4">
                <span>Menampilkan {totalRows === 0 ? 0 : startIndex}-{endIndex} dari {totalRows} data</span>
                
                <div className="flex items-center gap-1">
                    <button 
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="p-1 rounded-md border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span className="px-2 font-medium">
                        Halaman {currentPage} dari {totalPages || 1}
                    </span>
                    <button 
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="p-1 rounded-md border border-slate-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Pagination;
