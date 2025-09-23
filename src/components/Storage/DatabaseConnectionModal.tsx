import React from 'react';
import { Modal, ModalBody } from '@/components/Common/Modal';
import { DatabaseConnectionForm } from './DatabaseConnectionForm';
import { DatabaseConnection } from '@/types/storage';

interface DatabaseConnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  connection?: DatabaseConnection;
  onSave: (connection: Omit<DatabaseConnection, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onTest?: (connection: Omit<DatabaseConnection, 'id' | 'createdAt' | 'updatedAt'>) => Promise<boolean>;
  isLoading?: boolean;
}

export const DatabaseConnectionModal: React.FC<DatabaseConnectionModalProps> = ({
  isOpen,
  onClose,
  connection,
  onSave,
  onTest,
  isLoading = false
}) => {
  const handleSave = async (connectionData: Omit<DatabaseConnection, 'id' | 'createdAt' | 'updatedAt'>) => {
    await onSave(connectionData);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={connection ? '编辑数据库连接' : '新建数据库连接'}
      size="lg"
      closeOnOverlayClick={!isLoading}
      closeOnEscape={!isLoading}
    >
      <ModalBody className="p-0">
        <DatabaseConnectionForm
          connection={connection}
          onSave={handleSave}
          onCancel={handleCancel}
          onTest={onTest}
          isLoading={isLoading}
          className="border-0 shadow-none"
        />
      </ModalBody>
    </Modal>
  );
};
