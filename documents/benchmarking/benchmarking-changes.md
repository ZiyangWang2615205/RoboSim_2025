Changes to make to the benchmarking:
 - Of the requirements Marius sent, the only benchmarking feature not already implemented is a predicted energy cost feature. 
 - He suggested using one energy unit for a horizontal move vs 2 for vertical. 

What is needed to implement it:
 - The website displays the current benchmarking in a graph and table, so the typescript for this must be updated to integrate the new category in the table's columns, drop-down menus and the graph
 - Data is displayed on the site by typescript calling on the API, which currently has distinct functions for pulling data from the database of the two benchmarking categories. 
 - A new function must be made in the API for the energy category
 - The database will need to be updated to have a section storing the energy used predictions
 - Need to find where the functions which enter data to the database are
 - A function detecting if a move is vertical or horizontal is needed, and then calculating the energy cost of the combined moves in a scenario using this
 - This data then needs to be added into the database

Relevant file locations:
 - API: src/api/graph
 - Typescript: several different files inside webclient, in both webclient/leaderboard and webclient/src 
 - Need to find where to write for the energy calculations, and data entry to the database
