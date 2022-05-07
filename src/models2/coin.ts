export default interface Coin {
    walletId: string;
    networkId: number;
    slug: string;
    price: string;
    xpub: string;
    zpub?: string;
    xpubBalance: string;
    xpubUnconfirmedBalance: string;
    zpubBalance?: string;
    zpubUnconfirmedBalance?: string;
    totalBalance: string;
    totalUnconfirmedBalance: string;
}