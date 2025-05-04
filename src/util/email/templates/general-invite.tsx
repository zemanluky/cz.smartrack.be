import * as React from "react";
import {Body, Button, Head, Heading, Html, Preview, Text} from "@react-email/components";

export interface IGeneralInviteProps {
    name: string;
    link: string;
}

export const GeneralInviteEmailTemplate: React.FC<IGeneralInviteProps> = ({ name, link }) => {
    return <Html lang="cs">
        <Head/>
        <Body>
            <Preview>Máte založen účet SmartRack, přihlaste se nyní.</Preview>
            <Heading as="h1">Byli jste pozváni jako administrátor do SmartRack</Heading>
            <Text>Pěkný den, {name}!</Text>
            <Text>
                Byl vám založen nový účet. Abyste mohli být součástí SmartRack jako administrátor, musíte si
                nastavit nové heslo. Tlačítkem níže si heslo můžete nastavit a následně se přihlásit.
            </Text>
            <Button href={link}>
                Nastavit heslo
            </Button>
            <Text>
                Pokud jste neočekávali pozvánku do SmartRack, považujte tento email za bezpředmětný.
            </Text>
        </Body>
    </Html>
}