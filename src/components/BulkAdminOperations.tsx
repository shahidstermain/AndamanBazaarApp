import React, { useState } from 'react';
import { CheckSquare, Trash2, Archive, Flag, Ban, CheckCircle, AlertTriangle } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, updateDoc, writeBatch, serverTimestamp } from 'firebase/firestore';

interface BulkAdminOperationsProps {
  selectedItems: string[];
  itemType: 'listings' | 'users' | 'reports';
  onOperationComplete: () => void;
  onClearSelection: () => void;
}

type BulkOperation = 
  | 'approve' 
  | 'reject' 
  | 'delete' 
  | 'archive' 
  | 'ban' 
  | 'unban' 
  | 'feature' 
  | 'unfeature';

export const BulkAdminOperations: React.FC<BulkAdminOperationsProps> = ({
  selectedItems,
  itemType,
  onOperationComplete,
  onClearSelection,
}) => {
  const [processing, setProcessing] = useState(false);
  const [showConfirm, setShowConfirm] = useState<BulkOperation | null>(null);

  const executeBulkOperation = async (operation: BulkOperation) => {
    if (selectedItems.length === 0) return;

    setProcessing(true);
    try {
      const batch = writeBatch(db);

      selectedItems.forEach((itemId) => {
        const docRef = doc(db, itemType, itemId);

        switch (operation) {
          case 'approve':
            batch.update(docRef, {
              moderationStatus: 'approved',
              moderatedAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            break;

          case 'reject':
            batch.update(docRef, {
              moderationStatus: 'rejected',
              moderatedAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            break;

          case 'delete':
            batch.update(docRef, {
              status: 'deleted',
              deletedAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            break;

          case 'archive':
            batch.update(docRef, {
              isActive: false,
              archivedAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            break;

          case 'ban':
            batch.update(docRef, {
              isBanned: true,
              bannedAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            break;

          case 'unban':
            batch.update(docRef, {
              isBanned: false,
              bannedAt: null,
              updatedAt: serverTimestamp(),
            });
            break;

          case 'feature':
            batch.update(docRef, {
              isFeatured: true,
              featuredAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            break;

          case 'unfeature':
            batch.update(docRef, {
              isFeatured: false,
              featuredAt: null,
              updatedAt: serverTimestamp(),
            });
            break;
        }
      });

      await batch.commit();

      alert(`Successfully ${operation}d ${selectedItems.length} ${itemType}`);
      onOperationComplete();
      onClearSelection();
    } catch (error) {
      console.error('Bulk operation error:', error);
      alert(`Failed to ${operation} ${itemType}. Please try again.`);
    } finally {
      setProcessing(false);
      setShowConfirm(null);
    }
  };

  const confirmOperation = (operation: BulkOperation) => {
    setShowConfirm(operation);
  };

  const cancelOperation = () => {
    setShowConfirm(null);
  };

  if (selectedItems.length === 0) {
    return null;
  }

  const operations: Array<{
    id: BulkOperation;
    label: string;
    icon: React.ElementType;
    color: string;
    dangerous?: boolean;
  }> = [];

  // Add operations based on item type
  if (itemType === 'listings') {
    operations.push(
      { id: 'approve', label: 'Approve', icon: CheckCircle, color: 'green' },
      { id: 'reject', label: 'Reject', icon: AlertTriangle, color: 'yellow' },
      { id: 'feature', label: 'Feature', icon: Flag, color: 'purple' },
      { id: 'unfeature', label: 'Unfeature', icon: Flag, color: 'gray' },
      { id: 'archive', label: 'Archive', icon: Archive, color: 'blue' },
      { id: 'delete', label: 'Delete', icon: Trash2, color: 'red', dangerous: true }
    );
  } else if (itemType === 'users') {
    operations.push(
      { id: 'ban', label: 'Ban', icon: Ban, color: 'red', dangerous: true },
      { id: 'unban', label: 'Unban', icon: CheckCircle, color: 'green' },
      { id: 'archive', label: 'Archive', icon: Archive, color: 'blue' }
    );
  } else if (itemType === 'reports') {
    operations.push(
      { id: 'approve', label: 'Resolve', icon: CheckCircle, color: 'green' },
      { id: 'reject', label: 'Dismiss', icon: AlertTriangle, color: 'yellow' }
    );
  }

  return (
    <>
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-white rounded-lg shadow-2xl border border-gray-300 p-4 min-w-[600px]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-teal-600" />
              <span className="font-semibold text-gray-900">
                {selectedItems.length} {itemType} selected
              </span>
            </div>
            <button
              onClick={onClearSelection}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Clear selection
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {operations.map((op) => {
              const Icon = op.icon;
              return (
                <button
                  key={op.id}
                  onClick={() => confirmOperation(op.id)}
                  disabled={processing}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg font-medium
                    transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed
                    ${
                      op.color === 'green'
                        ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                        : op.color === 'red'
                        ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                        : op.color === 'yellow'
                        ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200'
                        : op.color === 'blue'
                        ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                        : op.color === 'purple'
                        ? 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {op.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Confirm Bulk Operation
            </h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to <strong>{showConfirm}</strong>{' '}
              <strong>{selectedItems.length}</strong> {itemType}? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelOperation}
                disabled={processing}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700
                         hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => executeBulkOperation(showConfirm)}
                disabled={processing}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700
                         disabled:opacity-50 flex items-center gap-2"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Processing...
                  </>
                ) : (
                  'Confirm'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
