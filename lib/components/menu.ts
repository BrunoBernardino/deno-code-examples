import { html } from '/lib/utils.ts';
import { RequestHandlerParams } from '/lib/page.ts';

export default function menu(
  currentPath: string,
  user?: RequestHandlerParams['user'],
  _session?: RequestHandlerParams['session'],
) {
  const commonMenuItemClasses = `flex ml-4 justify-center items-center`;
  const commonNonFirstMenuItemClasses = `sm:before:content-['//'] sm:before:mr-4 sm:before:text-sky-700`;
  const commonMenuLinkClasses =
    'inline-block w-full py-2 px-2 hover:decoration-sky-700 hover:underline transition-all hover:bg-slate-900 rounded-sm';
  const commonActiveMenuLinkClasses = 'font-bold active bg-slate-900';

  const blogMenuItem = html`
    <li class="${commonMenuItemClasses} ${commonNonFirstMenuItemClasses}">
      <a href="/blog" class="${commonMenuLinkClasses} ${
    currentPath.startsWith('/blog') ? commonActiveMenuLinkClasses : ''
  }">
        Blog
      </a>
    </li>
  `;

  const loggedInMenuOptions = html`
    <li class="${commonMenuItemClasses}">
      <a href="/dashboard" class="${commonMenuLinkClasses} ${
    currentPath.startsWith('/dashboard') ? commonActiveMenuLinkClasses : ''
  }">
        Dashboard
      </a>
    </li>
    ${
    user
      ? html`
      <li class="${commonMenuItemClasses} ${commonNonFirstMenuItemClasses}">
        <a href="/fill-a-form" class="${commonMenuLinkClasses} ${
        currentPath.startsWith('/fill-a-form') ? commonActiveMenuLinkClasses : ''
      }">
          Fill a form
        </a>
      </li>
    `
      : ''
  }
    ${blogMenuItem}
    <li class="${commonMenuItemClasses} ${commonNonFirstMenuItemClasses}">
      <a href="/logout" class="${commonMenuLinkClasses}">
        Logout
      </a>
    </li>
  `;

  const loggedOutMenuOptions = html`
    <li class="${commonMenuItemClasses}">
      <a href="/" class="${commonMenuLinkClasses} ${currentPath === '/' ? commonActiveMenuLinkClasses : ''}">
        Login
      </a>
    </li>
    ${blogMenuItem}
  `;

  return html`
    <header class="flex flex-row py-4 justify-between min-w-full bg-slate-900 text-slate-50 shadow-md">
      <a href="/" class="sm:px-6 px-2 flex items-center" id="menu-logo">
        <img alt="Logo: stylized snail and letters brn" src="/public/images/logo.svg" width="120" />
      </a>
      <nav class="sm:flex flex-row sm:px-6 px-2 justify-end">
        <ul class="sm:flex flex-row sm:px-6 px-2 justify-end">
          ${user ? loggedInMenuOptions : loggedOutMenuOptions}
        </ul>
      </nav>
    </header>
  `;
}
