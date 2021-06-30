import { DateTime } from "luxon";
import * as readlineSync  from 'readline-sync'
import csv = require('csv-parser');
import fs = require('fs');
import { configure, getLogger } from "log4js";

configure({
    appenders: {
        file: { type: 'fileSync', filename: 'logs/debug.log' }
    },
    categories: {
        default: { appenders: ['file'], level: 'debug'}
    }
});

const logger = getLogger("./index.ts");

class Account {
    name: string = ""
    incomingTransactions: Transaction[] = []
    outgoingTransactions: Transaction[] = []
    balance: number = 0

    constructor(name: string) {
        logger.info("Account created with name: " + name)
        this.name = name
    }

    addBalance(amount: number): void {
        this.balance = this.balance + amount
    }

    toString(): string {
        return this.name
    }

}

class Transaction {
    date: DateTime
    from: Account
    to: Account
    narrative: string
    amount: number = 0

    constructor(date: DateTime, from: Account, to: Account, narrative: string, amount: number) {
        this.date = date
        this.from = from
        this.to = to
        this.narrative = narrative
        this.amount = amount
        logger.info("Transaction created with values: " + date.toFormat("d/M/yyyy") + " " +  from + " " + to + " " + narrative + " " + amount)
    }
}

function readCSV(){
    const transactions: Record<string, string>[] = [];
    logger.trace("Reading CSV")
    fs.createReadStream('Transactions2015.csv')
        .pipe(csv())
        .on('data', (data) => transactions.push(data))
        .on('end', () => {
            logger.trace("CSV Read Finished")
            listenForCommands(parseList(transactions))
        })
}

function readJSON(){
    fs.readFile('Transactions2013.json', 'utf8' , (err, data) => {
        if (err) {
            console.error(err)
            return
        }
        //console.log(data)
        data = data.split('"FromAccount"').join('"From"')
        data = data.split('"ToAccount"').join('"To"')
        console.log(data)
        const transactionsJSON: any = JSON.parse(data)

        listenForCommands(parseList(transactionsJSON))
    })
}

function parseList(list: Record<string, string>[]): [Transaction[], Map<string, Account>] {
    //console.log(list)
    logger.trace("Parsing CSV")
    let transactions: Transaction[] = []
    let accounts: Map<string, Account> = new Map()
    list.forEach(function (transaction: Record<string, string>, index: number) {
        addTransaction(transaction, accounts, transactions, index + 2)
    })
    calculateTotalBalance(accounts)
    logger.trace("CSV parsed")
    return [transactions, accounts]
}

function addTransaction(transaction: Record<string, string>, accounts: Map<string, Account>, transactions: Transaction[], index: number) {
    logger.trace("Adding transaction")
    const toName = transaction["To"];
    const fromName = transaction["From"];

    // If the users don't have an account, create one
    if (!accounts.has(fromName)) {
        accounts.set(fromName, new Account(fromName))
    }
    if (!accounts.has(toName)) {
        accounts.set(toName, new Account(toName))
    }

    const fromAccount: Account = <Account>accounts.get(fromName)
    const toAccount: Account = <Account>accounts.get(toName)

    let date: DateTime = parseDate(transaction["Date"])
    let amount: number = parseInt(transaction["Amount"])

    if (!date.isValid) {
        logger.warn("Invalid date at line: " + index.toString())
    }
    if (isNaN(amount)){
        logger.warn("Invalid amount from " + fromName + " to " + toName + " at line: " + index.toString())
        amount = 0
    }

    // Create the transaction
    const newTransaction: Transaction = new Transaction(
        date,
        fromAccount,
        toAccount,
        transaction["Narrative"],
        amount)

    // Add the transaction to relevant locations
    transactions.push(newTransaction);
    fromAccount.outgoingTransactions.push(newTransaction);
    toAccount.incomingTransactions.push(newTransaction);
}

function calculateTotalBalance(accounts: Map<string, Account>) {
    logger.trace("Calculating total balance")
    accounts.forEach((account: Account, name: string) => {
        calculateAccountBalance(account)
    })
}

function calculateAccountBalance(account: Account) {
    logger.trace("Calculating " + account.name + "'s balance")
    account.balance = 0
    account.balance += totalTransactions(account.incomingTransactions)
    account.balance -= totalTransactions(account.outgoingTransactions)
}

function totalTransactions(transactions: Transaction[]): number{
    logger.trace("Totaling transactions")
    let total: number = 0
    for ( let currentTransaction of transactions ) {
        total += currentTransaction.amount
    }
    return total
}

function parseDate(dateString: string): DateTime {
    let date: DateTime = DateTime.fromFormat(dateString, "d/M/yyyy")
    if (date.isValid){
        return date
    }
    else {
        date = DateTime.fromISO(dateString)
    }
    return date
}

function list(option: string, transactions: Transaction[], accounts: Map<string, Account>){
    if (option == "All"){
        listALl(transactions, accounts)
    }
    else{
        listAccount(option, transactions, accounts)
    }
}

function listAccount(name: string, transactions: Transaction[], accounts: Map<string, Account>){
    logger.trace("Listing account")
    if (!accounts.has(name)){
        console.log("That account doesn't exist")
        return
    }
    const account: Account = <Account>accounts.get(name)

    console.log("===============Outgoing transactions===============")
    account.outgoingTransactions.map(outputTransaction)
    console.log("")
    console.log("===============Incoming Transactions===============")
    account.incomingTransactions.map(outputTransaction)
}

function outputTransaction(transaction: Transaction){
    console.log("Date: " + transaction.date.toFormat("d/M/yyyy") +
                "           From: " + transaction.from.name +
                "           To: " + transaction.to.name +
                "           Amount: " + transaction.amount.toString() +
                "           Narrative: " + transaction.narrative)
}

function listALl(transactions: Transaction[], accounts: Map<string, Account>){
    logger.trace("Listing all")
    accounts.forEach((account: Account, name: string) => {
        console.log(name + ": " + account.balance.toString())
    })
}

function setup(){
    logger.trace("Start")
    //readCSV()
    readJSON()
}

function listenForCommands([transactions, accounts]: [Transaction[], Map<string, Account>]){
    readlineSync.promptCLLoop({
        list: function(name: string) { list(name, transactions, accounts) },
        bye: function() { return true; }
    });

    console.log('Exited');
}

setup()