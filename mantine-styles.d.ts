declare module "@mantine/core/styles.css";
declare module "@mantine/notifications/styles.css";

declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}
