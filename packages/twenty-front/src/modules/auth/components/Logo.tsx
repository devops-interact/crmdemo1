import styled from '@emotion/styled';
import { isNonEmptyString } from '@sniptt/guards';
import { AppPath } from 'twenty-shared/types';
import { getImageAbsoluteURI, isDefined } from 'twenty-shared/utils';
import { Avatar } from 'twenty-ui/display';
import { UndecoratedLink } from 'twenty-ui/navigation';
import { REACT_APP_SERVER_BASE_URL } from '~/config';
import { useRedirectToDefaultDomain } from '~/modules/domain-manager/hooks/useRedirectToDefaultDomain';

type LogoProps = {
  primaryLogo?: string | null;
  secondaryLogo?: string | null;
  placeholder?: string | null;
  onClick?: () => void;
};

const StyledContainer = styled.div`
  height: ${({ theme }) => theme.spacing(12)};
  margin-bottom: ${({ theme }) => theme.spacing(4)};
  margin-top: ${({ theme }) => theme.spacing(4)};

  position: relative;
  width: ${({ theme }) => theme.spacing(12)};
`;

const StyledSecondaryLogo = styled.img`
  border-radius: ${({ theme }) => theme.border.radius.xs};
  height: ${({ theme }) => theme.spacing(6)};
  width: ${({ theme }) => theme.spacing(6)};
`;

const StyledSecondaryLogoContainer = styled.div`
  align-items: center;
  background-color: ${({ theme }) => theme.background.primary};
  border-radius: ${({ theme }) => theme.border.radius.sm};
  bottom: ${({ theme }) => `-${theme.spacing(3)}`};
  display: flex;
  height: ${({ theme }) => theme.spacing(7)};
  justify-content: center;

  position: absolute;
  right: ${({ theme }) => `-${theme.spacing(3)}`};
  width: ${({ theme }) => theme.spacing(7)};
`;

const StyledPrimaryLogo = styled.img`
  height: 100%;
  width: 100%;
  object-fit: contain;
`;

export const Logo = ({
  primaryLogo,
  secondaryLogo,
  placeholder,
  onClick,
}: LogoProps) => {
  const { redirectToDefaultDomain } = useRedirectToDefaultDomain();
  const defaultPrimaryLogoUrl = `${window.location.origin}/branding/abcorp-logo.png`;

  // For static files in /public/, use the URL directly without getImageAbsoluteURI
  // getImageAbsoluteURI is for server-uploaded files in /files/, not static assets
  // Static files in /public/ are served directly at the root path
  const getLogoUrl = (logo: string | null | undefined): string => {
    if (!logo) return defaultPrimaryLogoUrl;
    
    // If it's already a full URL, use it directly
    if (logo.startsWith('http://') || logo.startsWith('https://')) {
      return logo;
    }
    
    // If it starts with /, it's a static file - use it directly
    if (logo.startsWith('/')) {
      return `${window.location.origin}${logo}`;
    }
    
    // Otherwise, it's a server-uploaded file - use getImageAbsoluteURI
    return getImageAbsoluteURI({
      imageUrl: logo,
      baseUrl: REACT_APP_SERVER_BASE_URL,
    });
  };

  const primaryLogoUrl = getLogoUrl(primaryLogo);
  const secondaryLogoUrl = isNonEmptyString(secondaryLogo)
    ? getLogoUrl(secondaryLogo)
    : null;

  const isUsingDefaultLogo = !isDefined(primaryLogo);

  return (
    <StyledContainer onClick={() => onClick?.()}>
      {isUsingDefaultLogo ? (
        <UndecoratedLink
          to={AppPath.SignInUp}
          onClick={redirectToDefaultDomain}
        >
          <StyledPrimaryLogo src={primaryLogoUrl} alt="AB Corp" />
        </UndecoratedLink>
      ) : (
        <StyledPrimaryLogo src={primaryLogoUrl} alt="AB Corp" />
      )}
      {isDefined(secondaryLogoUrl) ? (
        <StyledSecondaryLogoContainer>
          <StyledSecondaryLogo src={secondaryLogoUrl} />
        </StyledSecondaryLogoContainer>
      ) : (
        isDefined(placeholder) && (
          <StyledSecondaryLogoContainer>
            <Avatar
              size="lg"
              placeholder={placeholder}
              type="squared"
              placeholderColorSeed={placeholder}
            />
          </StyledSecondaryLogoContainer>
        )
      )}
    </StyledContainer>
  );
};
