# TROVE SEARCH
## ExLibris Cloud App to search Trove
___
### PROBLEM

This Cloud App is developed as part of the inaugral ANZREG Cloud Apps Hackathon 2021.

The problem statement is as follows:

> Search Trove
> 
> Similar to the Hathi Trust app, use metadata from bib records and resource sharing requests in Alma to retrieve records in Trove.
> Potential uses include:
> - checking holdings if last copy held in Australia - may impact decision to weed from collection
> - checking catalogue records/updating
> - from a request could be used to see what other libraries hold the title
>
>https://trove.nla.gov.au/about/create-something/using-api

___

### TEAM
_Team Name_: __The Treasure Trove__

Members:
- Cathryn Co (UTS)
- Kevin Lin (UNSW)
- Nishen Naidoo (Macquarie)
- Debbie Storz (La Trobe)
- Yuan Zhong (UNSW)

___

### Setting up the Environment

Ensure you've got your environment configured. You can find instructions on doing that in the [Getting Started Guide](https://developers.exlibrisgroup.com/cloudapps/started/).

Once you've got the __eca__ command line installed, checkout this repository.

You need to copy the __config.json.sample__ file to __config.json__. Then edit the file and replace `"[add your institution code here]"` with your institution code. You should then be able to start the app with:
```
eca start
```

