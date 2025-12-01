import { t } from '@lingui/core/macro';
import { AppBasePath, AppPath, SettingsPath } from 'twenty-shared/types';

enum SettingsPathPrefixes {
  Accounts = `${AppBasePath.Settings}/${SettingsPath.Accounts}`,
  Experience = `${AppBasePath.Settings}/${SettingsPath.Experience}`,
  Profile = `${AppBasePath.Settings}/${SettingsPath.ProfilePage}`,
  Objects = `${AppBasePath.Settings}/${SettingsPath.Objects}`,
  Members = `${AppBasePath.Settings}/${SettingsPath.WorkspaceMembersPage}`,
  ApiWebhooks = `${AppBasePath.Settings}/${SettingsPath.ApiWebhooks}`,
  ServerlessFunctions = `${AppBasePath.Settings}/${SettingsPath.ServerlessFunctions}`,
  Integration = `${AppBasePath.Settings}/${SettingsPath.Integrations}`,
  General = `${AppBasePath.Settings}/${SettingsPath.Workspace}`,
}

const getPathnameOrPrefix = (pathname: string) => {
  for (const prefix of Object.values(SettingsPathPrefixes)) {
    if (pathname.startsWith(prefix)) {
      return prefix;
    }
  }
  return pathname;
};

const appendBrandName = (title: string): string => {
  // Don't append if already contains AB Corp or is empty
  if (!title || title.includes('AB Corp')) {
    return title || 'AB Corp';
  }
  return `${title} | AB Corp`;
};

export const getPageTitleFromPath = (pathname: string): string => {
  const pathnameOrPrefix = getPathnameOrPrefix(pathname);
  let title: string;
  switch (pathnameOrPrefix) {
    case AppPath.Verify:
      title = t`Verify`;
      break;
    case AppPath.SignInUp:
      title = t`Sign in or Create an account`;
      break;
    case AppPath.Invite:
      title = t`Invite`;
      break;
    case AppPath.CreateWorkspace:
      title = t`Create Workspace`;
      break;
    case AppPath.CreateProfile:
      title = t`Create Profile`;
      break;
    case SettingsPathPrefixes.Experience:
      title = t`Experience - Settings`;
      break;
    case SettingsPathPrefixes.Accounts:
      title = t`Account - Settings`;
      break;
    case SettingsPathPrefixes.Profile:
      title = t`Profile - Settings`;
      break;
    case SettingsPathPrefixes.Members:
      title = t`Members - Settings`;
      break;
    case SettingsPathPrefixes.Objects:
      title = t`Data model - Settings`;
      break;
    case SettingsPathPrefixes.ApiWebhooks:
      title = t`API Keys - Settings`;
      break;
    case SettingsPathPrefixes.ServerlessFunctions:
      title = t`Functions - Settings`;
      break;
    case SettingsPathPrefixes.Integration:
      title = t`Integrations - Settings`;
      break;
    case SettingsPathPrefixes.General:
      title = t`General - Settings`;
      break;
    default:
      return 'AB Corp';
  }
  return appendBrandName(title);
};
