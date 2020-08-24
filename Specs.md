# Family Tree

## Goals of V1
  - A web application.
  - Can add a person on web page.
  - Can upload photos of a person.
  - Can add a relation between two persons.
  
Person can have:
  - Multiple names. Each name should have:
    - family name
    - given name
    - middle name
    - full name
    - name type
    - name order
  - life from
  - life end
  - bio-gender
  - social gender
  - other info

Relations:
  - bio father
  - bio mother
  - parent
  - child
  - spouse. properties:
    - from
    - end

## Endpoints:
  - Add a new person (without relations)
  - Update a person (properties only)
  - Add a relation between two persons
  - Add a new person as parent/child/... of an existing person
  - Remove a relation between two persons
  - Delete a person
