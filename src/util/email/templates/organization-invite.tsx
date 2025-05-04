import * as React from "react";
import {Body, Button, Head, Heading, Html, Preview, Text} from "@react-email/components";

export interface IOrganizationInviteProps {
    name: string;
    organizationName: string;
    link: string;
}

export const OrganizationTemplateEmailTemplate: React.FC<IOrganizationInviteProps> = ({ name, organizationName, link }) => {
    return <Html lang="cs">
        <Head/>
        <Body>
            <Preview>Organizace {organizationName} vám vytvořila nový účet SmartRack, přihlaste se.</Preview>
            <Heading as="h1">Organizace {organizationName} vás zve do SmartRack</Heading>
            <Text>Pěkný den, {name}!</Text>
            <Text>
                Organizace {organizationName} vám založila nový účet. Abyste mohli být součástí SmartRack, musíte si
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