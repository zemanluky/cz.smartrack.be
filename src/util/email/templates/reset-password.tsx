import * as React from "react";
import {Body, Button, Head, Heading, Html, Preview, Text} from "@react-email/components";

export interface IResetPasswordProps {
    name: string;
    expiryHours: number;
    link: string;
}

export const ResetPasswordEmailTemplate: React.FC<IResetPasswordProps> = ({ name, expiryHours, link }) => {
    const hoursPlural = expiryHours === 1
        ? 'hodinu'
        : expiryHours <= 4
            ? 'hodiny'
            : 'hodin'
    ;

    return <Html lang="cs">
        <Head/>
        <Body>
            <Preview>Požádali jste si o obnovu hesla? Resetujte si heslo kliknutím na odkaz.</Preview>
            <Heading as="h1">Žádost o změnu hesla</Heading>
            <Text>Pěkný den, {name}!</Text>
            <Text>
                Zaznamenali jsme novou žádost o změnu hesla. Tlačítkem níže si můžete heslo nastavit a následně se s ním
                přihlásit. Odkaz vyprší za <Text>{expiryHours} {hoursPlural}</Text>.
            </Text>
            <Button href={link}>
                Nastavit nové heslo
            </Button>
            <Text>
                Pokud jste o změnu nezažádali, smažte tento email, nikomu ho neposílejte a považujte ho za bezpředmětný.
            </Text>
        </Body>
    </Html>
}