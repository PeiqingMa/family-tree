package me.self.familytree.controller

import io.micronaut.http.HttpResponse
import io.micronaut.http.annotation.*
import me.self.familytree.beans.FamilyRelations
import me.self.familytree.beans.Person
import me.self.familytree.beans.RelationRequest
import me.self.familytree.service.FamilyTreeService
import javax.inject.Inject

@Controller("/v1")
class FamilyTreeController(
        @Inject private val familyTreeService: FamilyTreeService
) {

    @Post("/person")
    fun addPerson(@Body inputPerson: Person): Person? {
        return familyTreeService.addPerson(inputPerson)
    }

    @Put("/person/{id:[0-9]+}")
    fun updatePerson(@PathVariable id: Long, @Body inputPerson: Person): Person? {
        inputPerson.id = id
        return familyTreeService.addPerson(inputPerson)
    }

    @Get("/person/{id:[0-9]+}")
    fun findPersonById(@PathVariable id: Long): Person? {
        return familyTreeService.findPerson(id)
    }

    @Post("/relation")
    fun addRelation(@Body request: RelationRequest): HttpResponse<Person?> {
        if (request.relationType == FamilyRelations.Type.Spouse) {
            familyTreeService.addSpouse(request.currentId, request.anotherId, request.spouseFrom, request.spouseEnd)
        } else {
            if (request.parentType == null || request.childType == null) {
                return HttpResponse.badRequest()
            }
            familyTreeService.addRelation(request)
        }
        val updated = familyTreeService.findPerson(request.currentId)
        return if (updated == null) HttpResponse.badRequest() else HttpResponse.ok(updated)
    }

    @Put("/relation/delete")
    fun removeRelation(@Body request: RelationRequest): HttpResponse<Person?> {
        familyTreeService.removeRelation(request.currentId, request.anotherId, request.relationType)
        val updated = familyTreeService.findPerson(request.currentId)
        return if (updated == null) HttpResponse.badRequest() else HttpResponse.ok(updated)
    }

}
