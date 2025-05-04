import React from "react";
import {CreateEmailResponse, Resend} from "resend";
import env from "../environment";
import {IOrganizationInviteProps, OrganizationTemplateEmailTemplate} from "./templates/organization-invite";
import {GeneralInviteEmailTemplate, IGeneralInviteProps} from "./templates/general-invite";
import {IResetPasswordProps, ResetPasswordEmailTemplate} from "./templates/reset-password";

export const resend = new Resend(env.RESEND_API_KEY);

/**
 * Sends an invitation to a given user to set their password and join the SmartRack application.
 * @param to Email address to send the email to.
 * @param props Dynamic properties to create the email with.
 */
export async function sendOrganizationInviteEmail(to: string, props: IOrganizationInviteProps): Promise<CreateEmailResponse> {
    return resend.emails.send({
        from: "SmartRack <smartrack@mail.zeluk.dev>",
        to: [to],
        subject: "Pozvánka do SmartRack",
        react: <OrganizationTemplateEmailTemplate {...props} />
    })
}

/**
 * Sends an invitation to a given user to set their account's password and join the SmartRack application as a system admin.
 * @param to Email address to send the email to.
 * @param props Dynamic properties to create the email with.
 */
export async function sendGeneralInviteEmail(to: string, props: IGeneralInviteProps): Promise<CreateEmailResponse> {
    return resend.emails.send({
        from: "SmartRack <smartrack@mail.zeluk.dev>",
        to: [to],
        subject: "Pozvánka do SmartRack",
        react: <GeneralInviteEmailTemplate {...props} />
    })
}

/**
 * Sends a reset password instructions email and link to the reset password page.
 * @param to Email address to send the email to.
 * @param props Dynamic properties to create the email with.
 */
export async function sendResetPasswordRequestEmail(to: string, props: IResetPasswordProps) {
    return resend.emails.send({
        from: "SmartRack <smartrack@mail.zeluk.dev>",
        to: [to],
        subject: "Žádost o změnu hesla SmartRack",
        react: <ResetPasswordEmailTemplate {...props} />
    })
}