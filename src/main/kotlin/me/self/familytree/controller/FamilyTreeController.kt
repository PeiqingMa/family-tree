package me.self.familytree.controller

import io.micronaut.http.MediaType
import io.micronaut.http.annotation.*
import me.self.familytree.beans.Person
import me.self.familytree.service.FamilyTreeService
import javax.inject.Inject

@Controller("/v1", produces = [MediaType.APPLICATION_JSON])
class FamilyTreeController(
        @Inject private val familyTreeService: FamilyTreeService
) {

    @Post("/person", consumes = [MediaType.APPLICATION_JSON])
    fun addPerson(@Body inputPerson: Person): Person? {
        return familyTreeService.addPerson(inputPerson)
    }

    @Put("/person/{id:[0-9]+}", consumes = [MediaType.APPLICATION_JSON])
    fun updatePerson(@PathVariable id: Long, @Body inputPerson: Person): Person? {
        inputPerson.id = id
        return familyTreeService.addPerson(inputPerson)
    }

}
