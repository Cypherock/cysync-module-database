# Cypherock Database Module

This modules acts as a database wrapper for all the database and server calls required to maintain the database for the application. 



# Models 

  - HardwareWallet - class for details of one wallet on the hardware
  - Transaction - class for details of one transaction
  - Xpub - class for details of one xpub such as current balance and thentype of ocin

# Databases 

  - PriceDB - supports only two methods. refresh, and get data. 
  - WalletDB - stores all wallets 
  - XpubDB - stores all xpubs and their corrosponding wallet IDs
  - TransactionDB - stores all the transactions and their corrosponding wallet ID. 