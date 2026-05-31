declare module "@iconscout/react-unicons" {
  import type { FC, SVGProps } from "react";

  export interface UniIconProps extends Omit<SVGProps<SVGSVGElement>, "color"> {
    size?: number | string;
    color?: string;
  }

  export type UniIcon = FC<UniIconProps>;

  // Kullanılan ikonlar (gerektikçe genişlet)
  export const UilApps: UniIcon;
  export const UilLinkAlt: UniIcon;
  export const UilLink: UniIcon;
  export const UilFileAlt: UniIcon;
  export const UilUsersAlt: UniIcon;
  export const UilInbox: UniIcon;
  export const UilMegaphone: UniIcon;
  export const UilSetting: UniIcon;
  export const UilAngleDown: UniIcon;
  export const UilArrowUpRight: UniIcon;
  export const UilPlus: UniIcon;
  export const UilTrashAlt: UniIcon;
  export const UilCheck: UniIcon;
  export const UilTimes: UniIcon;
  export const UilCopy: UniIcon;
  export const UilExternalLinkAlt: UniIcon;
  export const UilPalette: UniIcon;
  export const UilBell: UniIcon;
  export const UilEstate: UniIcon;
  export const UilUserCircle: UniIcon;
  export const UilUser: UniIcon;
  export const UilStar: UniIcon;
  export const UilSignOutAlt: UniIcon;
  export const UilSignout: UniIcon;
  export const UilPlusCircle: UniIcon;
  export const UilSearch: UniIcon;
}
