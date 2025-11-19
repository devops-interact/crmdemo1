import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { useSetRecoilState } from 'recoil';

import { useAuth } from '@/auth/hooks/useAuth';
import { useSignInWithGoogle } from '@/auth/sign-in-up/hooks/useSignInWithGoogle';
import {
  SignInUpStep,
  signInUpStepState,
} from '@/auth/states/signInUpStepState';
import styled from '@emotion/styled';
import { useLingui } from '@lingui/react/macro';
import { HorizontalSeparator, IconGoogle } from 'twenty-ui/display';
import { MainButton } from 'twenty-ui/input';

import { useSnackBar } from '@/ui/feedback/snack-bar-manager/hooks/useSnackBar';
import {
  GUEST_USER_EMAIL,
  GUEST_USER_PASSWORD,
  IS_GUEST_AUTO_LOGIN_ENABLED,
  REACT_APP_SERVER_BASE_URL,
} from '~/config';

const StyledContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(6)};
  justify-content: center;
  min-height: 100vh;
  padding: ${({ theme }) => theme.spacing(6)};
  width: 100%;
  background-color: ${({ theme }) => theme.background.primary};
`;

const StyledLogo = styled.img`
  max-width: 220px;
  width: 100%;
`;

const StyledButtonGroup = styled.div`
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing(3)};
  width: min(320px, 100%);
`;

const StyledFooterInfo = styled.div`
  color: ${({ theme }) => theme.font.color.tertiary};
  font-size: ${({ theme }) => theme.font.size.sm};
  text-align: center;
  line-height: ${({ theme }) => theme.text.lineHeight.md};
`;

export const WelcomeLanding = () => {
  const { t } = useLingui();
  const { enqueueErrorSnackBar } = useSnackBar();
  const { signInWithGoogle } = useSignInWithGoogle();
  const { signInWithCredentials } = useAuth();
  const setSignInUpStep = useSetRecoilState(signInUpStepState);

  const [isGuestSigningIn, setIsGuestSigningIn] = useState(false);

  const guestCredentialsConfigured = useMemo(
    () => Boolean(GUEST_USER_EMAIL && GUEST_USER_PASSWORD),
    [],
  );

  const handleGoogleLogin = () => {
    signInWithGoogle({ action: 'join-workspace' });
  };

  const handleGuestLogin = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!guestCredentialsConfigured) {
      enqueueErrorSnackBar({
        message: t`Guest credentials are not configured. Please provide VITE_GUEST_EMAIL and VITE_GUEST_PASSWORD.`,
      });
      setSignInUpStep(SignInUpStep.Email);
      return;
    }

    try {
      setIsGuestSigningIn(true);
      await signInWithCredentials(
        GUEST_USER_EMAIL.toLowerCase().trim(),
        GUEST_USER_PASSWORD,
      );
    } catch (error: any) {
      const message =
        error?.message ?? t`Unable to sign in with the guest credentials.`;
      enqueueErrorSnackBar({ message });
    } finally {
      setIsGuestSigningIn(false);
    }
  };

  useEffect(() => {
    if (IS_GUEST_AUTO_LOGIN_ENABLED && guestCredentialsConfigured) {
      void handleGuestLogin(new MouseEvent('click') as any);
    }
  }, [guestCredentialsConfigured]);

  return (
    <StyledContainer>
      <StyledLogo
        src="/branding/abcorp-logo.svg"
        alt={t`Company logo`}
        draggable={false}
      />

      <StyledButtonGroup>
        <MainButton
          Icon={IconGoogle}
          title={t`Continue with Google`}
          onClick={handleGoogleLogin}
          fullWidth
        />

        <HorizontalSeparator visible={false} />

        <MainButton
          title={isGuestSigningIn ? t`Entering as guest...` : t`Enter as guest`}
          variant="secondary"
          onClick={handleGuestLogin}
          fullWidth
          disabled={isGuestSigningIn}
        />
      </StyledButtonGroup>

      <StyledFooterInfo>
        {t`You will access the workspace hosted at ${REACT_APP_SERVER_BASE_URL}.`}
      </StyledFooterInfo>
    </StyledContainer>
  );
};
