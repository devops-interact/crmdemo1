import { Modal } from '@/ui/layout/modal/components/Modal';
import { useModal } from '@/ui/layout/modal/hooks/useModal';
import styled from '@emotion/styled';
import { t } from '@lingui/core/macro';
import { useState } from 'react';
import {
    H1Title,
    H1TitleFontColor,
    IconCheck,
    IconLock,
} from 'twenty-ui/display';
import { Button } from 'twenty-ui/input';
import { useGetRolesQuery } from '~/generated-metadata/graphql';

const StyledRoleList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(1)};
  max-height: 300px;
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing(2)} 0;
`;

const StyledRoleItem = styled.div<{ isSelected: boolean }>`
  display: flex;
  align-items: center;
  padding: ${({ theme }) => theme.spacing(2)};
  border-radius: ${({ theme }) => theme.border.radius.sm};
  cursor: pointer;
  background: ${({ theme, isSelected }) =>
    isSelected ? theme.background.transparent.strong : 'transparent'};
  border: 1px solid
    ${({ theme, isSelected }) =>
      isSelected ? theme.border.color.strong : theme.border.color.light};
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.background.transparent.lighter};
    border-color: ${({ theme }) => theme.border.color.medium};
  }
`;

const StyledRoleIcon = styled.div`
  margin-right: ${({ theme }) => theme.spacing(2)};
  display: flex;
  align-items: center;
`;

const StyledRoleInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const StyledRoleName = styled.div`
  color: ${({ theme }) => theme.font.color.primary};
  font-weight: ${({ theme }) => theme.font.weight.medium};
`;

const StyledRoleDescription = styled.div`
  font-size: ${({ theme }) => theme.font.size.sm};
  color: ${({ theme }) => theme.font.color.secondary};
  margin-top: ${({ theme }) => theme.spacing(0.5)};
`;

const StyledCheckIcon = styled.div`
  margin-left: ${({ theme }) => theme.spacing(2)};
  display: flex;
  align-items: center;
`;

type AssignRoleToMemberModalProps = {
  modalId: string;
  workspaceMemberId: string;
  currentRoleId?: string;
  onConfirm: (roleId: string) => void;
  onClose: () => void;
};

export const AssignRoleToMemberModal = ({
  modalId,
  workspaceMemberId,
  currentRoleId,
  onConfirm,
  onClose,
}: AssignRoleToMemberModalProps) => {
  const [selectedRoleId, setSelectedRoleId] = useState<string | undefined>(
    currentRoleId,
  );
  const { closeModal } = useModal();

  const { data: rolesData, loading } = useGetRolesQuery();

  // Filtrar roles que pueden ser asignados a usuarios
  const availableRoles =
    rolesData?.getRoles?.filter((role) => role.canBeAssignedToUsers) ?? [];

  const handleConfirm = () => {
    if (selectedRoleId) {
      onConfirm(selectedRoleId);
      closeModal(modalId);
      onClose();
    }
  };

  const handleClose = () => {
    closeModal(modalId);
    onClose();
  };

  return (
    <Modal
      modalId={modalId}
      onClose={handleClose}
      isClosable={true}
      size="medium"
    >
      <Modal.Header>
        <H1Title title={t`Assign Role`} fontColor={H1TitleFontColor.Primary} />
      </Modal.Header>
      <Modal.Content>
        {loading ? (
          <div>{t`Loading roles...`}</div>
        ) : availableRoles.length === 0 ? (
          <div>{t`No roles available to assign`}</div>
        ) : (
          <StyledRoleList>
            {availableRoles.map((role) => (
              <StyledRoleItem
                key={role.id}
                isSelected={selectedRoleId === role.id}
                onClick={() => setSelectedRoleId(role.id)}
              >
                <StyledRoleIcon>
                  <IconLock size={16} />
                </StyledRoleIcon>
                <StyledRoleInfo>
                  <StyledRoleName>{role.label}</StyledRoleName>
                  {role.description && (
                    <StyledRoleDescription>
                      {role.description}
                    </StyledRoleDescription>
                  )}
                </StyledRoleInfo>
                {selectedRoleId === role.id && (
                  <StyledCheckIcon>
                    <IconCheck size={16} />
                  </StyledCheckIcon>
                )}
              </StyledRoleItem>
            ))}
          </StyledRoleList>
        )}
      </Modal.Content>
      <Modal.Footer>
        <Button title={t`Cancel`} variant="secondary" onClick={handleClose} />
        <Button
          title={t`Assign Role`}
          variant="primary"
          onClick={handleConfirm}
          disabled={!selectedRoleId || selectedRoleId === currentRoleId}
        />
      </Modal.Footer>
    </Modal>
  );
};
